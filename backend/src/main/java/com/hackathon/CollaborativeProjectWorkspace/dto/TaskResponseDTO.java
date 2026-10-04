package com.hackathon.CollaborativeProjectWorkspace.dto;

import com.hackathon.CollaborativeProjectWorkspace.entity.Tasks;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TaskResponseDTO {
    private Long id;
    private Long projectId;
    private String title;
    private String description;
    private Long assigneeId;
    private String assigneeName;
    private Tasks.TaskStatus status;
    private LocalDateTime deadline;
    private Long version;
    private LocalDateTime updatedAt;
}
