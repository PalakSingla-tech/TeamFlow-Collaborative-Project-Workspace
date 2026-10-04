package com.hackathon.CollaborativeProjectWorkspace.repository;

import com.hackathon.CollaborativeProjectWorkspace.entity.Attachments;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttachmentsRepository extends JpaRepository<Attachments, Long> {

    @Query("SELECT a FROM Attachments a JOIN FETCH a.uploadedBy WHERE a.task.id = :taskId ORDER BY a.uploadedAt DESC")
    List<Attachments> findByTaskIdWithUploader(@Param("taskId") Long taskId);
}
