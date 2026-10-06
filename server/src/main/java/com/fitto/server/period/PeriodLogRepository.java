package com.fitto.server.period;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PeriodLogRepository extends JpaRepository<PeriodLog, UUID> {

	List<PeriodLog> findAllByUserIdOrderByStartDate(UUID userId);

	boolean existsByUserId(UUID userId);

	/**
	 * 목록을 통째로 바꾸기 전에 지운다. 바로 실행되는 일괄 삭제여야 한다 —
	 * 엔티티를 지우고 같은 시작일로 다시 넣으면 Hibernate가 저장을 삭제보다 먼저 내보내 유일 제약에 걸린다.
	 */
	@Modifying
	@Query("delete from PeriodLog l where l.userId = :userId")
	void deleteAllOfUser(@Param("userId") UUID userId);
}
