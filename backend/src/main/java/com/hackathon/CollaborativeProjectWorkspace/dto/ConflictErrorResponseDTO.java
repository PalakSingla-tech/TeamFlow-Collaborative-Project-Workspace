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
public class ConflictErrorResponseDTO {
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
    private String error;
    private int statusCode;
    private TaskResponseDTO latestTask;
}
