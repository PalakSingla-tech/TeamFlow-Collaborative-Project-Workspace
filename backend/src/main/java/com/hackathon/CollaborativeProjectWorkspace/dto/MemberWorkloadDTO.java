package com.hackathon.CollaborativeProjectWorkspace.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MemberWorkloadDTO {
    private Long userId;
    private String username;
    private long totalTasks;
    private long completedTasks;
    private long pendingTasks;
}
