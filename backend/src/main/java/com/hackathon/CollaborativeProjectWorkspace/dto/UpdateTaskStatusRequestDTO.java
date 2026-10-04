package com.hackathon.CollaborativeProjectWorkspace.dto;

import com.hackathon.CollaborativeProjectWorkspace.entity.Tasks;
import lombok.Data;

@Data
public class UpdateTaskStatusRequestDTO {
    private Tasks.TaskStatus status;
}
