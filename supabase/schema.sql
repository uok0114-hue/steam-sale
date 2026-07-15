-- 1. 게임 마스터 테이블
CREATE TABLE IF NOT EXISTS games (
    app_id INT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    header_image VARCHAR(512),
    is_free BOOLEAN DEFAULT FALSE,
    has_kr_patch BOOLEAN DEFAULT FALSE,         -- 유저 한글패치 유무
    kr_patch_url VARCHAR(512),                  -- 유저 한글패치 링크
    kr_positive_rate INT DEFAULT 0,             -- 한국인 긍정률 (0~100)
    last_updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 게임 실시간 가격 테이블
CREATE TABLE IF NOT EXISTS game_prices (
    app_id INT PRIMARY KEY REFERENCES games(app_id) ON DELETE CASCADE,
    steam_price INT NOT NULL,                   -- 스팀 현재가
    steam_discount_percent INT DEFAULT 0,       -- 스팀 현재 할인율
    domestic_price INT,                         -- 국내 스토어 최저가 (다이렉트게임즈 등)
    domestic_store_name VARCHAR(100),           -- 국내 최저가 판매점 이름
    lowest_recorded_price INT NOT NULL,         -- 역대 최저가 기록
    lowest_recorded_at TIMESTAMP,               -- 역대 최저가 기록일
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. 유저 찜하기 및 알림 수신 테이블
CREATE TABLE IF NOT EXISTS user_wishlists (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,              -- 소셜 로그인 고유 식별자
    app_id INT REFERENCES games(app_id) ON DELETE CASCADE,
    alert_target_price INT,                     -- 타겟 알림가 (null 시 역대 최저가 기준)
    notification_channel VARCHAR(50) DEFAULT 'kakaotalk', -- kakaotalk, discord, telegram
    channel_destination VARCHAR(512) NOT NULL,   -- 알림 전송용 토큰/디스코드 웹훅 URL
    created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 추가 (조회 최적화)
CREATE INDEX IF NOT EXISTS idx_games_title ON games(title);
CREATE INDEX IF NOT EXISTS idx_user_wishlists_user_id ON user_wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wishlists_app_id ON user_wishlists(app_id);
