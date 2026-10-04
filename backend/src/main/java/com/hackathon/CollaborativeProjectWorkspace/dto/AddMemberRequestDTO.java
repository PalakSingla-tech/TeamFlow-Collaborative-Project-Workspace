package com.hackathon.CollaborativeProjectWorkspace.dto;

import com.hackathon.CollaborativeProjectWorkspace.entity.ProjectMembers;
import lombok.Data;

@Data
public class AddMemberRequestDTO {
    private String emailOrUsername;
    private ProjectMembers.ProjectRole role;
}
