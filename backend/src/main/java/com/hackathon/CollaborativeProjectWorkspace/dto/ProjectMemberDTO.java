package com.hackathon.CollaborativeProjectWorkspace.dto;

import com.hackathon.CollaborativeProjectWorkspace.entity.ProjectMembers;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ProjectMemberDTO {
    private Long memberId;
    private Long userId;
    private String username;
    private String email;
    private ProjectMembers.ProjectRole role;
}
