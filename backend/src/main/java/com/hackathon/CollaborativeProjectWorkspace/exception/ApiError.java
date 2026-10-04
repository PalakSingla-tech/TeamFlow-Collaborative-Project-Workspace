package com.hackathon.CollaborativeProjectWorkspace.exception;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.http.HttpStatusCode;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ApiError {
    @Builder.Default
    private LocalDateTime timeStamp = LocalDateTime.now();
    private String error;
    private HttpStatusCode statusCode;

    public ApiError(String error, HttpStatusCode statusCode) {
        this.timeStamp = LocalDateTime.now();
        this.error = error;
        this.statusCode = statusCode;
    }
}
