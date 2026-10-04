package com.hackathon.CollaborativeProjectWorkspace.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ProjectEventDTO {
    private String eventType;
    private Long projectId;
    private Long taskId;
    private Long actorId;
    private String actorName;
    private String message;
    private Object data;

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
}
