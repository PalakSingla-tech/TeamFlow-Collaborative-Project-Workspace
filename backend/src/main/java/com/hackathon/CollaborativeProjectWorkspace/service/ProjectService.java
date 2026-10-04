package com.hackathon.CollaborativeProjectWorkspace.service;

import com.hackathon.CollaborativeProjectWorkspace.dto.AddMemberRequestDTO;
import com.hackathon.CollaborativeProjectWorkspace.dto.CreateProjectRequestDTO;
import com.hackathon.CollaborativeProjectWorkspace.dto.ProjectEventDTO;
import com.hackathon.CollaborativeProjectWorkspace.dto.ProjectMemberDTO;
import com.hackathon.CollaborativeProjectWorkspace.dto.ProjectResponseDTO;
import com.hackathon.CollaborativeProjectWorkspace.entity.ActivityLog;
import com.hackathon.CollaborativeProjectWorkspace.entity.ProjectMembers;
import com.hackathon.CollaborativeProjectWorkspace.entity.Projects;
import com.hackathon.CollaborativeProjectWorkspace.entity.User;
import com.hackathon.CollaborativeProjectWorkspace.exception.BadRequestException;
import com.hackathon.CollaborativeProjectWorkspace.exception.ResourceNotFoundException;
import com.hackathon.CollaborativeProjectWorkspace.exception.UnauthorizedActionException;
import com.hackathon.CollaborativeProjectWorkspace.mapper.ProjectMapper;
import com.hackathon.CollaborativeProjectWorkspace.repository.ActivityLogRepository;
import com.hackathon.CollaborativeProjectWorkspace.repository.ProjectMembersRepository;
import com.hackathon.CollaborativeProjectWorkspace.repository.ProjectsRepository;
import com.hackathon.CollaborativeProjectWorkspace.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectService {

    private final ProjectsRepository projectsRepository;
    private final ProjectMembersRepository projectMembersRepository;
    private final UserRepository userRepository;
    private final ActivityLogRepository activityLogRepository;
    private final ProjectMapper projectMapper;
    private final ProjectEventPublisher eventPublisher;

    @Transactional
    public ProjectResponseDTO createProject(CreateProjectRequestDTO request, User currentUser) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new BadRequestException("Project name is required");
        }
        if (request.getDescription() == null || request.getDescription().trim().isEmpty()) {
            throw new BadRequestException("Project description is required");
        }

        Projects project = Projects.builder()
                .name(request.getName().trim())
                .description(request.getDescription().trim())
                .owner(currentUser)
                .build();

        Projects savedProject = projectsRepository.save(project);

        // Creator is also registered as OWNER in project_members
        ProjectMembers ownerMember = ProjectMembers.builder()
                .project(savedProject)
                .user(currentUser)
                .role(ProjectMembers.ProjectRole.OWNER)
                .build();
        ProjectMembers savedOwnerMember = projectMembersRepository.save(ownerMember);

        // Record activity log (best-effort)
        try {
            activityLogRepository.save(ActivityLog.builder()
                    .user(currentUser)
                    .project(savedProject)
                    .activityType(ActivityLog.ActivityType.PROJECT_CREATED)
                    .description("Project '" + savedProject.getName() + "' created by " + currentUser.getUsername())
                    .build());
        } catch (Exception e) {
            log.warn("Failed to create activity log: {}", e.getMessage());
        }

        List<ProjectMemberDTO> initialMembers = List.of(projectMapper.toProjectMemberDTO(savedOwnerMember));
        return projectMapper.toProjectResponse(savedProject, initialMembers);
    }

    @Transactional(readOnly = true)
    public List<ProjectResponseDTO> getUserProjects(User currentUser) {
        List<Projects> projects = projectsRepository.findAllAccessibleProjectsByUserId(currentUser.getUserId());
        return projects.stream()
                .map(projectMapper::toProjectResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProjectResponseDTO getProjectById(Long projectId, User currentUser) {
        Projects project = projectsRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        validateUserInProject(projectId, currentUser.getUserId());

        List<ProjectMembers> members = projectMembersRepository.findMembersWithUserByProjectId(project.getProjectId());
        List<ProjectMemberDTO> memberDTOs = members.stream()
                .map(projectMapper::toProjectMemberDTO)
                .collect(Collectors.toList());

        return projectMapper.toProjectResponse(project, memberDTOs);
    }

    @Transactional
    public ProjectMemberDTO addMemberToProject(Long projectId, AddMemberRequestDTO request, User currentUser) {
        Projects project = projectsRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        // Validate requesting user is OWNER or ADMIN
        ProjectMembers requesterMembership = projectMembersRepository
                .findByProject_ProjectIdAndUser_UserId(projectId, currentUser.getUserId())
                .orElseThrow(() -> new UnauthorizedActionException("You are not a member of this project"));

        if (requesterMembership.getRole() != ProjectMembers.ProjectRole.OWNER
                && requesterMembership.getRole() != ProjectMembers.ProjectRole.ADMIN) {
            throw new UnauthorizedActionException("Only project owners and admins can invite or add members");
        }

        if (request.getEmailOrUsername() == null || request.getEmailOrUsername().trim().isEmpty()) {
            throw new BadRequestException("Username or email is required to add member");
        }

        ProjectMembers.ProjectRole roleToAssign = request.getRole() != null
                ? request.getRole()
                : ProjectMembers.ProjectRole.MEMBER;

        if (roleToAssign == ProjectMembers.ProjectRole.OWNER) {
            throw new BadRequestException("A new member cannot be assigned the OWNER role");
        }

        String searchKey = request.getEmailOrUsername().trim();
        User invitedUser = userRepository.findByUsername(searchKey)
                .or(() -> userRepository.findByEmail(searchKey))
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username or email: " + searchKey));

        // Check if user is already a member
        if (projectMembersRepository.existsByProject_ProjectIdAndUser_UserId(projectId, invitedUser.getUserId())) {
            throw new BadRequestException("User '" + invitedUser.getUsername() + "' is already a member of this project");
        }

        ProjectMembers newMember = ProjectMembers.builder()
                .project(project)
                .user(invitedUser)
                .role(roleToAssign)
                .build();

        ProjectMembers savedMember = projectMembersRepository.save(newMember);

        // Record activity log (best-effort)
        try {
            activityLogRepository.save(ActivityLog.builder()
                    .user(currentUser)
                    .project(project)
                    .activityType(ActivityLog.ActivityType.MEMBER_ADDED)
                    .description("Member @" + invitedUser.getUsername() + " added with role " + roleToAssign)
                    .build());
        } catch (Exception e) {
            log.warn("Failed to create activity log: {}", e.getMessage());
        }

        ProjectMemberDTO memberDTO = projectMapper.toProjectMemberDTO(savedMember);

        // Broadcast real-time WebSocket event
        eventPublisher.publishEvent(ProjectEventDTO.builder()
                .eventType("member_added")
                .projectId(projectId)
                .actorId(currentUser.getUserId())
                .actorName(currentUser.getUsername())
                .message(currentUser.getUsername() + " added @" + invitedUser.getUsername() + " to the project")
                .data(memberDTO)
                .build());

        return memberDTO;
    }

    @Transactional
    public ProjectMemberDTO joinProject(Long projectId, User currentUser) {
        Projects project = projectsRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        // If user is already a member, return existing membership idempotently
        Optional<ProjectMembers> existing = projectMembersRepository
                .findByProject_ProjectIdAndUser_UserId(projectId, currentUser.getUserId());
        if (existing.isPresent()) {
            return projectMapper.toProjectMemberDTO(existing.get());
        }

        // New member joins as MEMBER
        ProjectMembers newMember = ProjectMembers.builder()
                .project(project)
                .user(currentUser)
                .role(ProjectMembers.ProjectRole.MEMBER)
                .build();

        ProjectMembers savedMember = projectMembersRepository.save(newMember);

        // Record activity log (best-effort)
        try {
            activityLogRepository.save(ActivityLog.builder()
                    .user(currentUser)
                    .project(project)
                    .activityType(ActivityLog.ActivityType.MEMBER_ADDED)
                    .description(currentUser.getUsername() + " joined the project via invite link")
                    .build());
        } catch (Exception e) {
            log.warn("Failed to create activity log for self-join: {}", e.getMessage());
        }

        ProjectMemberDTO memberDTO = projectMapper.toProjectMemberDTO(savedMember);

        // Broadcast real-time WebSocket event
        eventPublisher.publishEvent(ProjectEventDTO.builder()
                .eventType("member_joined")
                .projectId(projectId)
                .actorId(currentUser.getUserId())
                .actorName(currentUser.getUsername())
                .message(currentUser.getUsername() + " joined the project")
                .data(memberDTO)
                .build());

        return memberDTO;
    }

    @Transactional(readOnly = true)
    public List<ProjectMemberDTO> getProjectMembers(Long projectId, User currentUser) {
        if (!projectsRepository.existsById(projectId)) {
            throw new ResourceNotFoundException("Project not found with id: " + projectId);
        }

        validateUserInProject(projectId, currentUser.getUserId());

        List<ProjectMembers> members = projectMembersRepository.findMembersWithUserByProjectId(projectId);
        return members.stream()
                .map(projectMapper::toProjectMemberDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public void validateUserInProject(Long projectId, Long userId) {
        boolean isMember = projectMembersRepository.existsByProject_ProjectIdAndUser_UserId(projectId, userId);
        if (!isMember) {
            throw new UnauthorizedActionException("Access denied: You are not a member of project " + projectId);
        }
    }
}
