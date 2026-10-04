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
public class UpdateTaskRequestDTO {
    private String title;
    private String description;
    private Long assigneeId;
    private LocalDateTime deadline;
    private Tasks.TaskStatus status;
    private Long baseVersion;
}
