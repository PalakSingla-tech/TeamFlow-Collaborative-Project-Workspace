package com.hackathon.CollaborativeProjectWorkspace.service;

import com.hackathon.CollaborativeProjectWorkspace.dto.*;
import com.hackathon.CollaborativeProjectWorkspace.entity.ActivityLog;
import com.hackathon.CollaborativeProjectWorkspace.entity.ProjectMembers;
import com.hackathon.CollaborativeProjectWorkspace.entity.Projects;
import com.hackathon.CollaborativeProjectWorkspace.entity.Tasks;
import com.hackathon.CollaborativeProjectWorkspace.entity.User;
import com.hackathon.CollaborativeProjectWorkspace.exception.BadRequestException;
import com.hackathon.CollaborativeProjectWorkspace.exception.ResourceNotFoundException;
import com.hackathon.CollaborativeProjectWorkspace.exception.TaskConflictException;
import com.hackathon.CollaborativeProjectWorkspace.exception.UnauthorizedActionException;
import com.hackathon.CollaborativeProjectWorkspace.repository.ActivityLogRepository;
import com.hackathon.CollaborativeProjectWorkspace.repository.ProjectMembersRepository;
import com.hackathon.CollaborativeProjectWorkspace.repository.ProjectsRepository;
import com.hackathon.CollaborativeProjectWorkspace.repository.TasksRepository;
import com.hackathon.CollaborativeProjectWorkspace.repository.UserRepository;
import com.hackathon.CollaborativeProjectWorkspace.specification.TaskSpecification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class TaskService {

    private final TasksRepository tasksRepository;
    private final ProjectsRepository projectsRepository;
    private final ProjectMembersRepository projectMembersRepository;
    private final UserRepository userRepository;
    private final ActivityLogRepository activityLogRepository;
    private final ProjectEventPublisher eventPublisher;

    @Transactional
    public TaskResponseDTO createTask(Long projectId, CreateTaskRequestDTO request, User currentUser) {
        Projects project = projectsRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        validateUserInProject(projectId, currentUser.getUserId());

        if (request.getTitle() == null || request.getTitle().trim().isEmpty()) {
            throw new BadRequestException("Task title is required");
        }

        User assignee = null;
        if (request.getAssigneeId() != null) {
            assignee = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Assignee not found with id: " + request.getAssigneeId()));
            validateUserInProject(projectId, assignee.getUserId());
        }

        Tasks.TaskStatus status = request.getStatus() != null ? request.getStatus() : Tasks.TaskStatus.TODO;

        Tasks task = Tasks.builder()
                .project(project)
                .title(request.getTitle().trim())
                .description(request.getDescription())
                .assignee(assignee)
                .status(status)
                .deadline(request.getDeadline())
                .build();

        Tasks savedTask = tasksRepository.save(task);

        // Record activity log (best-effort)
        try {
            activityLogRepository.save(ActivityLog.builder()
                    .user(currentUser)
                    .project(project)
                    .task(savedTask)
                    .activityType(ActivityLog.ActivityType.TASK_CREATED)
                    .description("Task '" + savedTask.getTitle() + "' created by " + currentUser.getUsername())
                    .build());
        } catch (Exception e) {
            log.warn("Failed to create activity log: {}", e.getMessage());
        }

        TaskResponseDTO responseDTO = toTaskResponseDTO(savedTask);

        // Broadcast real-time WebSocket event
        eventPublisher.publishEvent(ProjectEventDTO.builder()
                .eventType("task_created")
                .projectId(projectId)
                .taskId(savedTask.getId())
                .actorId(currentUser.getUserId())
                .actorName(currentUser.getUsername())
                .message(currentUser.getUsername() + " created a new task: " + savedTask.getTitle())
                .data(responseDTO)
                .build());

        return responseDTO;
    }

    @Transactional(readOnly = true)
    public Page<TaskResponseDTO> getTasks(
            Long projectId,
            Long assigneeId,
            Tasks.TaskStatus status,
            LocalDateTime deadlineBefore,
            LocalDateTime deadlineAfter,
            Pageable pageable,
            User currentUser
    ) {
        if (!projectsRepository.existsById(projectId)) {
            throw new ResourceNotFoundException("Project not found with id: " + projectId);
        }

        validateUserInProject(projectId, currentUser.getUserId());

        Page<Tasks> taskPage = tasksRepository.findAll(
                TaskSpecification.filterTasks(projectId, assigneeId, status, deadlineBefore, deadlineAfter),
                pageable
        );

        return taskPage.map(this::toTaskResponseDTO);
    }

    @Transactional(readOnly = true)
    public TaskResponseDTO getTaskById(Long taskId, User currentUser) {
        Tasks task = tasksRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        validateUserInProject(task.getProject().getProjectId(), currentUser.getUserId());

        return toTaskResponseDTO(task);
    }

    @Transactional
    public TaskResponseDTO updateTask(Long taskId, UpdateTaskRequestDTO request, User currentUser) {
        Tasks task = tasksRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        validateUserInProject(task.getProject().getProjectId(), currentUser.getUserId());

        // Optimistic Concurrency Control (OCC):
        // Safe Rule:
        // - status, assignee, deadline: last write wins
        // - title, description: detect conflict and reject if baseVersion is stale
        boolean isEditingTitle = request.getTitle() != null && !request.getTitle().trim().equals(task.getTitle());
        boolean isEditingDesc = request.getDescription() != null && !request.getDescription().equals(task.getDescription());

        if ((isEditingTitle || isEditingDesc) && request.getBaseVersion() != null) {
            if (!request.getBaseVersion().equals(task.getVersion())) {
                throw new TaskConflictException(
                        "This task was updated by someone else.",
                        toTaskResponseDTO(task)
                );
            }
        }

        if (request.getTitle() != null && !request.getTitle().trim().isEmpty()) {
            task.setTitle(request.getTitle().trim());
        }
        if (request.getDescription() != null) {
            task.setDescription(request.getDescription());
        }
        if (request.getStatus() != null) {
            task.setStatus(request.getStatus());
        }
        if (request.getDeadline() != null) {
            task.setDeadline(request.getDeadline());
        }
        if (request.getAssigneeId() != null) {
            User assignee = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Assignee not found with id: " + request.getAssigneeId()));
            validateUserInProject(task.getProject().getProjectId(), assignee.getUserId());
            task.setAssignee(assignee);
        }

        Tasks updated = tasksRepository.save(task);

        try {
            activityLogRepository.save(ActivityLog.builder()
                    .user(currentUser)
                    .project(task.getProject())
                    .task(updated)
                    .activityType(ActivityLog.ActivityType.TASK_UPDATED)
                    .description("Task '" + updated.getTitle() + "' updated by " + currentUser.getUsername())
                    .build());
        } catch (Exception e) {
            log.warn("Failed to create activity log: {}", e.getMessage());
        }

        TaskResponseDTO responseDTO = toTaskResponseDTO(updated);

        // Broadcast real-time WebSocket event
        eventPublisher.publishEvent(ProjectEventDTO.builder()
                .eventType("task_updated")
                .projectId(task.getProject().getProjectId())
                .taskId(updated.getId())
                .actorId(currentUser.getUserId())
                .actorName(currentUser.getUsername())
                .message(currentUser.getUsername() + " updated this task")
                .data(responseDTO)
                .build());

        return responseDTO;
    }

    @Transactional
    public void deleteTask(Long taskId, User currentUser) {
        Tasks task = tasksRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        Long projectId = task.getProject().getProjectId();
        ProjectMembers membership = projectMembersRepository
                .findByProject_ProjectIdAndUser_UserId(projectId, currentUser.getUserId())
                .orElseThrow(() -> new UnauthorizedActionException("You are not a member of this project"));

        // Only OWNER, ADMIN, or task assignee can delete
        boolean isOwnerOrAdmin = membership.getRole() == ProjectMembers.ProjectRole.OWNER
                || membership.getRole() == ProjectMembers.ProjectRole.ADMIN;
        boolean isAssignee = task.getAssignee() != null && task.getAssignee().getUserId().equals(currentUser.getUserId());

        if (!isOwnerOrAdmin && !isAssignee) {
            throw new UnauthorizedActionException("Only project owners, admins, or task assignee can delete this task");
        }

        tasksRepository.delete(task);

        // Broadcast real-time WebSocket event
        eventPublisher.publishEvent(ProjectEventDTO.builder()
                .eventType("task_deleted")
                .projectId(projectId)
                .taskId(taskId)
                .actorId(currentUser.getUserId())
                .actorName(currentUser.getUsername())
                .message(currentUser.getUsername() + " deleted a task")
                .data(taskId)
                .build());
    }

    @Transactional
    public TaskResponseDTO assignTask(Long taskId, AssignTaskRequestDTO request, User currentUser) {
        Tasks task = tasksRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        Long projectId = task.getProject().getProjectId();
        validateUserInProject(projectId, currentUser.getUserId());

        if (request == null || request.getAssigneeId() == null) {
            task.setAssignee(null);
        } else {
            User assignee = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + request.getAssigneeId()));
            validateUserInProject(projectId, assignee.getUserId());
            task.setAssignee(assignee);
        }

        Tasks updated = tasksRepository.save(task);

        String assigneeDesc = updated.getAssignee() != null ? "@" + updated.getAssignee().getUsername() : "unassigned";

        try {
            activityLogRepository.save(ActivityLog.builder()
                    .user(currentUser)
                    .project(task.getProject())
                    .task(updated)
                    .activityType(ActivityLog.ActivityType.TASK_ASSIGNED)
                    .description("Task '" + updated.getTitle() + "' assigned to " + assigneeDesc)
                    .build());
        } catch (Exception e) {
            log.warn("Failed to create activity log: {}", e.getMessage());
        }

        TaskResponseDTO responseDTO = toTaskResponseDTO(updated);

        // Broadcast real-time WebSocket event
        eventPublisher.publishEvent(ProjectEventDTO.builder()
                .eventType("task_updated")
                .projectId(projectId)
                .taskId(updated.getId())
                .actorId(currentUser.getUserId())
                .actorName(currentUser.getUsername())
                .message(currentUser.getUsername() + " assigned task to " + assigneeDesc)
                .data(responseDTO)
                .build());

        return responseDTO;
    }

    @Transactional
    public TaskResponseDTO changeStatus(Long taskId, UpdateTaskStatusRequestDTO request, User currentUser) {
        if (request == null || request.getStatus() == null) {
            throw new BadRequestException("Status is required");
        }

        Tasks task = tasksRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        validateUserInProject(task.getProject().getProjectId(), currentUser.getUserId());

        task.setStatus(request.getStatus());
        Tasks updated = tasksRepository.save(task);

        try {
            activityLogRepository.save(ActivityLog.builder()
                    .user(currentUser)
                    .project(task.getProject())
                    .task(updated)
                    .activityType(ActivityLog.ActivityType.TASK_STATUS_CHANGED)
                    .description("Task '" + updated.getTitle() + "' status changed to " + request.getStatus())
                    .build());
        } catch (Exception e) {
            log.warn("Failed to create activity log: {}", e.getMessage());
        }

        TaskResponseDTO responseDTO = toTaskResponseDTO(updated);

        // Broadcast real-time WebSocket event
        eventPublisher.publishEvent(ProjectEventDTO.builder()
                .eventType("task_updated")
                .projectId(task.getProject().getProjectId())
                .taskId(updated.getId())
                .actorId(currentUser.getUserId())
                .actorName(currentUser.getUsername())
                .message(currentUser.getUsername() + " changed status to " + request.getStatus())
                .data(responseDTO)
                .build());

        return responseDTO;
    }

    @Transactional
    public TaskResponseDTO setDeadline(Long taskId, UpdateDeadLineRequestDTO request, User currentUser) {
        Tasks task = tasksRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        validateUserInProject(task.getProject().getProjectId(), currentUser.getUserId());

        task.setDeadline(request != null ? request.getDeadline() : null);
        Tasks updated = tasksRepository.save(task);

        try {
            activityLogRepository.save(ActivityLog.builder()
                    .user(currentUser)
                    .project(task.getProject())
                    .task(updated)
                    .activityType(ActivityLog.ActivityType.TASK_DEADLINE_CHANGED)
                    .description("Task '" + updated.getTitle() + "' deadline set to " + task.getDeadline())
                    .build());
        } catch (Exception e) {
            log.warn("Failed to create activity log: {}", e.getMessage());
        }

        TaskResponseDTO responseDTO = toTaskResponseDTO(updated);

        // Broadcast real-time WebSocket event
        eventPublisher.publishEvent(ProjectEventDTO.builder()
                .eventType("task_updated")
                .projectId(task.getProject().getProjectId())
                .taskId(updated.getId())
                .actorId(currentUser.getUserId())
                .actorName(currentUser.getUsername())
                .message(currentUser.getUsername() + " updated task deadline")
                .data(responseDTO)
                .build());

        return responseDTO;
    }

    @Transactional(readOnly = true)
    public void validateUserInProject(Long projectId, Long userId) {
        boolean isMember = projectMembersRepository.existsByProject_ProjectIdAndUser_UserId(projectId, userId);
        if (!isMember) {
            throw new UnauthorizedActionException("Access denied: You are not a member of project " + projectId);
        }
    }

    public TaskResponseDTO toTaskResponseDTO(Tasks task) {
        return TaskResponseDTO.builder()
                .id(task.getId())
                .projectId(task.getProject() != null ? task.getProject().getProjectId() : null)
                .title(task.getTitle())
                .description(task.getDescription())
                .assigneeId(task.getAssignee() != null ? task.getAssignee().getUserId() : null)
                .assigneeName(task.getAssignee() != null ? task.getAssignee().getUsername() : null)
                .status(task.getStatus())
                .deadline(task.getDeadline())
                .version(task.getVersion())
                .updatedAt(task.getUpdatedAt())
                .build();
    }
}
