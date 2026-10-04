package com.hackathon.CollaborativeProjectWorkspace.exception;

import com.hackathon.CollaborativeProjectWorkspace.dto.TaskResponseDTO;
import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@Getter
@ResponseStatus(HttpStatus.CONFLICT)
public class TaskConflictException extends RuntimeException {
    private final TaskResponseDTO latestTask;

    public TaskConflictException(String message, TaskResponseDTO latestTask) {
        super(message);
        this.latestTask = latestTask;
    }
}
