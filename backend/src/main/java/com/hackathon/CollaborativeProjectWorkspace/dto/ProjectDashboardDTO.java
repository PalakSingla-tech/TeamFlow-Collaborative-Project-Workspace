package com.hackathon.CollaborativeProjectWorkspace.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ProjectDashboardDTO {
    private Long projectId;
    private String projectName;
    private long totalTasks;
    private Map<String, Long> tasksByStatus;
    private double completionPercentage;
    private long overdueTasks;
    private long tasksDueToday;
    private long tasksDueThisWeek;
    private List<MemberWorkloadDTO> memberWorkloads;
}
