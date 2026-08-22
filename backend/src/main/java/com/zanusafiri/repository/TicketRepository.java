package com.zanusafiri.repository;

import com.zanusafiri.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long>, JpaSpecificationExecutor<Ticket> {
    List<Ticket> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<Ticket> findByTicketNumber(String ticketNumber);
    boolean existsByTicketNumber(String ticketNumber);
    boolean existsByReferenceNumber(String referenceNumber);
    Optional<Ticket> findByQrToken(String qrToken);
    Optional<Ticket> findByReferenceNumber(String referenceNumber);
    Optional<Ticket> findByTransactionReference(String transactionReference);
    void deleteByRouteId(Long routeId);
    void deleteByFromStopIdOrToStopId(Long fromStopId, Long toStopId);
}
