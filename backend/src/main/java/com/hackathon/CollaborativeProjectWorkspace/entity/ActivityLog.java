package com.hackathon.CollaborativeProjectWorkspace.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "activity_log")
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // User who performed the action
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Project in which the activity occurred
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private Projects project;

    // Optional: task related to the activity
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Tasks task;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActivityType activityType;

    // Human-readable description
    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private LocalDateTime createdAt;


    public enum ActivityType {
        PROJECT_CREATED,
        MEMBER_ADDED,
        MEMBER_REMOVED,

        TASK_CREATED,
        TASK_UPDATED,
        TASK_ASSIGNED,
        TASK_STATUS_CHANGED,
        TASK_DEADLINE_CHANGED,

        COMMENT_ADDED,

        ATTACHMENT_UPLOADED,
        ATTACHMENT_DELETED
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
