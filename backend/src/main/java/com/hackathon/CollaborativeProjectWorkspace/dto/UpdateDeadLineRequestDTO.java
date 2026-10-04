package com.hackathon.CollaborativeProjectWorkspace.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UpdateDeadLineRequestDTO {
    private LocalDateTime deadline;
}
