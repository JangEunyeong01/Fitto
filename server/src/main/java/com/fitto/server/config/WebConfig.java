package com.fitto.server.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.fitto.server.auth.WriteRateLimitInterceptor;

/** 컨트롤러 앞뒤에 붙는 것들. 지금은 쓰기 요청 횟수 제한 하나뿐이다. */
@Configuration
public class WebConfig implements WebMvcConfigurer {

	private final WriteRateLimitInterceptor writeRateLimitInterceptor;

	public WebConfig(WriteRateLimitInterceptor writeRateLimitInterceptor) {
		this.writeRateLimitInterceptor = writeRateLimitInterceptor;
	}

	@Override
	public void addInterceptors(InterceptorRegistry registry) {
		registry.addInterceptor(writeRateLimitInterceptor);
	}
}
