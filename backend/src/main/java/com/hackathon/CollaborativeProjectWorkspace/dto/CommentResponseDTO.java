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
public class CommentResponseDTO {
    private Long id;
    private Long taskId;
    private Long authorId;
    private String authorName;
    private String authorEmail;
    private String body;
    private LocalDateTime createdAt;
}
