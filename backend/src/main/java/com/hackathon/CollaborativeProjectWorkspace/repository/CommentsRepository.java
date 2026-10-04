package com.hackathon.CollaborativeProjectWorkspace.repository;

import com.hackathon.CollaborativeProjectWorkspace.entity.Comments;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentsRepository extends JpaRepository<Comments, Long> {

    @Query("SELECT c FROM Comments c JOIN FETCH c.author WHERE c.task.id = :taskId ORDER BY c.createdAt ASC")
    List<Comments> findByTaskIdWithAuthor(@Param("taskId") Long taskId);
}
