package com.fitto.server;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import com.fitto.server.config.StartupSecurityCheck;

@SpringBootApplication
public class ServerApplication {

	public static void main(String[] args) {
		SpringApplication application = new SpringApplication(ServerApplication.class);
		// 설정을 읽은 직후 위험한 값을 검사한다. 빈이 만들어지기 전이라 원인이 로그 맨 앞에 남는다.
		StartupSecurityCheck.register(application);
		application.run(args);
	}

}
