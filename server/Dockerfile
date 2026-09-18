# 빌드와 실행을 분리한다. 빌드 도구(Gradle·JDK 전체)는 최종 이미지에 넣지 않는다 —
# 이미지가 작을수록 배포가 빠르고, 실행에 필요 없는 도구가 서버에 남지 않는다.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# 의존성 목록만 먼저 복사한다. 소스만 바뀐 경우 이 층은 캐시에서 재사용돼 빌드가 빨라진다.
COPY gradlew ./
COPY gradle ./gradle
COPY build.gradle settings.gradle ./
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon || true

COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test

FROM eclipse-temurin:21-jre
WORKDIR /app

# root로 돌리지 않는다. 컨테이너가 뚫렸을 때 할 수 있는 일을 줄인다.
RUN useradd --create-home --shell /bin/false fitto
USER fitto

COPY --from=build --chown=fitto:fitto /app/build/libs/*.jar app.jar

# 호스팅이 주는 포트를 그대로 쓴다(Render·Railway는 PORT를 주입한다).
ENV PORT=8080
EXPOSE 8080

# sh를 거치지 않는다. 중간에 끼면 SIGTERM이 java까지 오지 않아,
# 배포로 컨테이너가 교체될 때 처리 중이던 요청이 그대로 끊긴다.
ENTRYPOINT ["java", "-jar", "app.jar"]
