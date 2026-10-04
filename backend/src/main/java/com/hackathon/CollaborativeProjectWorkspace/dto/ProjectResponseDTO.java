package com.hackathon.CollaborativeProjectWorkspace.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ProjectResponseDTO {
    private Long projectId;
    private String name;
    private String description;
    private Long ownerId;
    private String ownerUsername;
    private List<ProjectMemberDTO> members;
}
