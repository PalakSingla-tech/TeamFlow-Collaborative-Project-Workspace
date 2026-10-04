package com.hackathon.CollaborativeProjectWorkspace.mapper;

import com.hackathon.CollaborativeProjectWorkspace.dto.ProjectMemberDTO;
import com.hackathon.CollaborativeProjectWorkspace.dto.ProjectResponseDTO;
import com.hackathon.CollaborativeProjectWorkspace.entity.ProjectMembers;
import com.hackathon.CollaborativeProjectWorkspace.entity.Projects;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ProjectMapper {

    public ProjectMemberDTO toProjectMemberDTO(ProjectMembers pm) {
        return ProjectMemberDTO.builder()
                .memberId(pm.getId())
                .userId(pm.getUser().getUserId())
                .username(pm.getUser().getUsername())
                .email(pm.getUser().getEmail())
                .role(pm.getRole())
                .build();
    }

    public ProjectResponseDTO toProjectResponse(Projects project, List<ProjectMemberDTO> memberDTOs) {
        return ProjectResponseDTO.builder()
                .projectId(project.getProjectId())
                .name(project.getName())
                .description(project.getDescription())
                .ownerId(project.getOwner() != null ? project.getOwner().getUserId() : null)
                .ownerUsername(project.getOwner() != null ? project.getOwner().getUsername() : null)
                .members(memberDTOs)
                .build();
    }

    public ProjectResponseDTO toProjectResponse(Projects project) {
        return toProjectResponse(project, null);
    }
}
