-- Fitto 초기 스키마 (V1)
--
-- Hibernate의 스키마 생성 기능으로 뽑은 DDL을 그대로 옮겼다.
-- 엔티티가 22개 테이블로 펼쳐져 손으로 쓰면 반드시 틀린다.
--
-- 운영에서는 ddl-auto: validate이므로, 엔티티를 바꾸면 여기에 새 마이그레이션(V2, V3...)을 추가해야 한다.
-- 이 파일은 이미 적용된 뒤에는 절대 수정하지 않는다 -- Flyway가 체크섬으로 변경을 감지해 부팅을 막는다.


    create table custom_ingredients (
        allergy boolean not null,
        calories integer not null,
        carbs float(53),
        fat float(53),
        protein float(53),
        sodium integer,
        sugar float(53),
        updated_at timestamp(6) with time zone not null,
        id uuid not null,
        user_id uuid not null,
        name varchar(30) not null,
        primary key (id),
        constraint uk_custom_ingredient_name unique (user_id, name)
    );

    create table daily_steps (
        date date not null,
        steps integer not null,
        id uuid not null,
        user_id uuid not null,
        primary key (id),
        constraint uk_daily_steps unique (user_id, date)
    );

    create table daily_water (
        amount integer not null,
        date date not null,
        id uuid not null,
        user_id uuid not null,
        primary key (id),
        constraint uk_daily_water unique (user_id, date)
    );

    create table meal_items (
        amount float(53) not null,
        calories integer not null,
        carbs float(53),
        date date not null,
        fat float(53),
        protein float(53),
        sodium integer,
        sugar float(53),
        created_at timestamp(6) with time zone not null,
        updated_at timestamp(6) with time zone not null,
        unit varchar(10) not null check ((unit in ('G','SERVING'))),
        id uuid not null,
        recipe_id uuid,
        user_id uuid not null,
        meal_type varchar(20) not null check ((meal_type in ('BREAKFAST','LUNCH','DINNER','SNACK'))),
        food_id varchar(50),
        name varchar(50) not null,
        serving_label varchar(50),
        primary key (id)
    );

    create table meal_memos (
        date date not null,
        id uuid not null,
        user_id uuid not null,
        meal_type varchar(20) not null check ((meal_type in ('BREAKFAST','LUNCH','DINNER','SNACK'))),
        memo varchar(80) not null,
        primary key (id),
        constraint uk_meal_memo unique (user_id, date, meal_type)
    );

    create table period_daily (
        date date not null,
        condition varchar(10) check ((condition in ('GOOD','NORMAL','BAD'))),
        id uuid not null,
        user_id uuid not null,
        medication varchar(50),
        memo varchar(200),
        primary key (id),
        constraint uk_period_daily unique (user_id, date)
    );

    create table period_daily_symptoms (
        period_daily_id uuid not null,
        code varchar(30)
    );

    create table period_settings (
        cycle_length integer not null,
        period_length integer not null,
        start_date date not null,
        user_id uuid not null,
        primary key (user_id)
    );

    create table recipe_ingredients (
        amount float(53) not null,
        calories integer not null,
        carbs float(53),
        fat float(53),
        protein float(53),
        sodium integer,
        sort_order integer check ((sort_order>=0)),
        sugar float(53),
        custom_ingredient_id uuid,
        id uuid not null,
        recipe_id uuid not null,
        name varchar(30) not null,
        food_id varchar(50),
        primary key (id)
    );

    create table recipes (
        created_at timestamp(6) with time zone not null,
        updated_at timestamp(6) with time zone not null,
        id uuid not null,
        user_id uuid not null,
        name varchar(30) not null,
        primary key (id)
    );

    create table refresh_tokens (
        expires_at timestamp(6) with time zone not null,
        revoked_at timestamp(6) with time zone,
        used_at timestamp(6) with time zone,
        id uuid not null,
        user_id uuid not null,
        token_hash varchar(64) not null unique,
        primary key (id)
    );

    create table routine_exercises (
        duration integer not null,
        sort_order integer check ((sort_order>=0)),
        id uuid not null,
        routine_id uuid not null,
        exercise_code varchar(30),
        name varchar(30) not null,
        primary key (id)
    );

    create table routines (
        id uuid not null,
        user_id uuid not null,
        name varchar(30) not null,
        primary key (id)
    );

    create table user_allergies (
        user_id uuid not null,
        code varchar(30)
    );

    create table user_custom_allergies (
        user_id uuid not null,
        item varchar(30)
    );

    create table user_custom_diseases (
        user_id uuid not null,
        item varchar(30)
    );

    create table user_custom_preferred_foods (
        user_id uuid not null,
        item varchar(30)
    );

    create table user_diseases (
        user_id uuid not null,
        code varchar(30)
    );

    create table user_preferred_foods (
        user_id uuid not null,
        code varchar(30)
    );

    create table users (
        age integer,
        birthday_day integer,
        birthday_month integer,
        cup_size integer not null,
        height float(53),
        period_enabled boolean not null,
        step_goal integer not null,
        target_calorie integer not null,
        target_weight float(53),
        water_goal integer not null,
        water_goal_custom boolean not null,
        weight float(53),
        created_at timestamp(6) with time zone not null,
        started_at timestamp(6) with time zone not null,
        updated_at timestamp(6) with time zone not null,
        gender varchar(10) check ((gender in ('FEMALE','MALE'))),
        id uuid not null,
        activity_level varchar(20) check ((activity_level in ('SEDENTARY','LIGHT','MODERATE','ACTIVE','VERY_ACTIVE'))),
        equipment varchar(20) not null,
        focus varchar(20) not null,
        goal varchar(20) check ((goal in ('LOSE_WEIGHT','GAIN_WEIGHT','MAINTAIN','HEALTH','STRENGTH','ENDURANCE'))),
        intensity varchar(20) not null,
        personality varchar(20) not null check ((personality in ('FRIENDLY','STRICT','NEUTRAL'))),
        name varchar(30) not null,
        email varchar(254) not null unique,
        password varchar(255) not null,
        primary key (id)
    );

    create table weight_logs (
        date date not null,
        weight float(53) not null,
        id uuid not null,
        user_id uuid not null,
        primary key (id),
        constraint uk_weight_log unique (user_id, date)
    );

    create table workouts (
        calories integer not null,
        date date not null,
        duration integer not null,
        created_at timestamp(6) with time zone not null,
        updated_at timestamp(6) with time zone not null,
        id uuid not null,
        routine_id uuid,
        user_id uuid not null,
        exercise_code varchar(30),
        name varchar(30) not null,
        memo varchar(60),
        primary key (id)
    );

    create index idx_meal_user_date 
       on meal_items (user_id, date);

    create index idx_recipe_user 
       on recipes (user_id);

    create index idx_refresh_token_user 
       on refresh_tokens (user_id);

    create index idx_routine_user 
       on routines (user_id);

    create index idx_workout_user_date 
       on workouts (user_id, date);

    alter table if exists period_daily_symptoms 
       add constraint FKs175pomlkmd4bn2f51e7qqlmi 
       foreign key (period_daily_id) 
       references period_daily;

    alter table if exists recipe_ingredients 
       add constraint FKcqlw8sor5ut10xsuj3jnttkc 
       foreign key (recipe_id) 
       references recipes;

    alter table if exists routine_exercises 
       add constraint FK85bhq039u7fg33l5n92wqn9m 
       foreign key (routine_id) 
       references routines;

    alter table if exists user_allergies 
       add constraint FK4mclrynvl1em11jh8sxt5s74k 
       foreign key (user_id) 
       references users;

    alter table if exists user_custom_allergies 
       add constraint FKjrtb6h8vjjnlyrryxxn1kryhx 
       foreign key (user_id) 
       references users;

    alter table if exists user_custom_diseases 
       add constraint FKjgj5ow2tovcvnhupq5akmxohx 
       foreign key (user_id) 
       references users;

    alter table if exists user_custom_preferred_foods 
       add constraint FK2sl4m3pefuatqfsc7byw7eb8b 
       foreign key (user_id) 
       references users;

    alter table if exists user_diseases 
       add constraint FKgtnoe6m7jh4w3jfmo6ls4g7rd 
       foreign key (user_id) 
       references users;

    alter table if exists user_preferred_foods 
       add constraint FKdg78vphpqb6a07n4rwuvyidfe 
       foreign key (user_id) 
       references users;
