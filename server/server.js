const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const cors = require("cors");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const passport = require("passport");
const KakaoStrategy = require("passport-kakao").Strategy;
const session = require("express-session");
const { format } = require("date-fns");
require("dotenv").config({ path: "./kakao.env" });
const jwt = require("jsonwebtoken");
const app = express();
const axios = require("axios");
const PORT = process.env.PORT || 3001;

// 환경 변수 설정
const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "Yeogi_main",
};

const EMAIL_CONFIG = {
  host: "smtp.naver.com",
  port: 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  secure: false,
};

let pool;

// 데이터베이스 연결 풀 생성 함수
function createPool() {
  pool = mysql.createPool({
    ...DB_CONFIG,
    connectionLimit: 10,
    queueLimit: 0,
  });

  pool.on("error", (err) => {
    console.error("데이터베이스 풀 오류:", err);
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      createPool();
    } else {
      throw err;
    }
  });
}

// 초기 연결 풀 생성
createPool();

// 에러 처리 함수
const handleDatabaseError = (res, error, message) => {
  console.error(message, error);
  return res.status(500).json({ error: "서버 오류가 발생했습니다." });
};
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    console.log("Decoded user from token:", user);
    req.user = user;
    next();
  });
};
// 데이터베이스 쿼리 함수
const queryDatabase = (query, params) => {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        console.error("데이터베이스 연결 오류:", err);
        if (err.code === "PROTOCOL_CONNECTION_LOST") {
          createPool();
        }
        return reject(err);
      }

      connection.query(query, params, (error, results) => {
        connection.release(); // 연결을 풀로 반환

        if (error) {
          console.error("쿼리 실행 오류:", error);
          return reject(error);
        }
        resolve(results);
      });
    });
  });
};

const sendVerificationEmail = (email, code) => {
  const transporter = nodemailer.createTransport(EMAIL_CONFIG);
  const mailOptions = {
    from: EMAIL_CONFIG.auth.user,
    to: email,
    subject: "회원가입 인증 코드",
    text: `회원가입을 위한 인증 코드입니다: ${code}`,
  };
  return transporter.sendMail(mailOptions);
};

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      "thisIsAVeryLongAndComplexSecretKeyForMySession123!@#",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24시간
      httpOnly: true,
    },
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.get("/api/likes/:userId", authenticateToken, async (req, res) => {
  const { userId } = req.params;
  try {
    const query = `
      SELECT a.* 
      FROM accommodations a 
      JOIN likes l ON a.id = l.accommodation_id 
      WHERE l.user_id = ?
      ORDER BY l.created_at DESC
    `;
    const results = await queryDatabase(query, [userId]);
    console.log("찜한 숙소 조회 결과:", results);
    res.json(results);
  } catch (error) {
    console.error("찜 목록 조회 중 오류 발생:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 특정 숙소의 예약 가능 여부 확인 API
app.get("/api/accommodations/:id/availability", async (req, res) => {
  try {
    const { id } = req.params;
    const { checkIn, checkOut } = req.query;

    const query = `
      SELECT COUNT(*) as count
      FROM bookings
      WHERE accommodation_id = ?
        AND status != 'cancelled'
        AND (
          (check_in_date <= ? AND check_out_date > ?)
          OR (check_in_date < ? AND check_out_date >= ?)
          OR (? <= check_in_date AND ? > check_in_date)
        )
    `;

    const [result] = await queryDatabase(query, [
      id,
      checkOut,
      checkIn,
      checkOut,
      checkOut,
      checkIn,
      checkOut,
    ]);

    const isAvailable = result.count === 0;
    res.json({ isAvailable });
  } catch (error) {
    console.error("예약 가능 여부 확인 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
// 검색 기록 저장 API
app.post("/api/search-history", authenticateToken, async (req, res) => {
  const { keyword } = req.body;
  const userId = req.user.id;

  try {
    await queryDatabase(
      "INSERT INTO search_history (user_id, keyword) VALUES (?, ?)",
      [userId, keyword]
    );
    res.json({ message: "검색 기록이 저장되었습니다." });
  } catch (error) {
    console.error("검색 기록 저장 중 오류 발생:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 추천 호텔 조회 라우트 수정
app.get("/recommended-hotels", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 사용자의 최근 검색어 가져오기
    const [recentSearch] = await queryDatabase(
      "SELECT keyword FROM search_history WHERE user_id = ? ORDER BY search_date DESC LIMIT 1",
      [userId]
    );

    let query = "SELECT * FROM accommodations";
    let params = [];

    if (recentSearch && recentSearch.keyword) {
      query += " WHERE name LIKE ? OR location LIKE ?";
      params = [`%${recentSearch.keyword}%`, `%${recentSearch.keyword}%`];
    }

    query += " LIMIT 10"; // 최대 10개의 추천 숙소 표시

    const results = await queryDatabase(query, params);
    res.json(results);
  } catch (error) {
    handleDatabaseError(res, error, "추천 호텔 조회 중 오류 발생:");
  }
});
// 예약 생성 API
app.post("/api/bookings", authenticateToken, async (req, res) => {
  try {
    const {
      accommodation_id,
      check_in_date,
      check_out_date,
      guests,
      total_price,
    } = req.body;
    const user_id = req.user.id;

    // 예약 가능 여부 확인
    const availabilityQuery = `
      SELECT COUNT(*) as count
      FROM bookings
      WHERE accommodation_id = ?
        AND status != 'cancelled'
        AND (
          (check_in_date <= ? AND check_out_date > ?)
          OR (check_in_date < ? AND check_out_date >= ?)
          OR (? <= check_in_date AND ? > check_in_date)
        )
    `;

    const [availabilityResult] = await queryDatabase(availabilityQuery, [
      accommodation_id,
      check_out_date,
      check_in_date,
      check_out_date,
      check_out_date,
      check_in_date,
      check_out_date,
    ]);

    if (availabilityResult.count > 0) {
      return res
        .status(400)
        .json({ error: "선택한 날짜에 이미 예약이 있습니다." });
    }

    // 예약 생성
    const insertQuery = `
      INSERT INTO bookings (accommodation_id, user_id, check_in_date, check_out_date, guests, total_price, payment_status, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', 'confirmed')
    `;

    const result = await queryDatabase(insertQuery, [
      accommodation_id,
      user_id,
      check_in_date,
      check_out_date,
      guests,
      total_price,
    ]);

    res
      .status(201)
      .json({ message: "예약이 생성되었습니다.", booking_id: result.insertId });
  } catch (error) {
    console.error("예약 생성 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
app.delete("/api/likes", authenticateToken, async (req, res) => {
  const { userId, accommodationId } = req.body;
  try {
    const query =
      "DELETE FROM likes WHERE user_id = ? AND accommodation_id = ?";
    await queryDatabase(query, [userId, accommodationId]);
    res.json({ message: "찜하기 취소 성공" });
  } catch (error) {
    console.error("찜하기 취소 중 오류 발생:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
// CORS 설정

// JSON 요청을 처리할 수 있도록 설정
app.use(express.json());

// 세션 미들웨어 설정
app.use(
  session({
    secret: process.env.SESSION_SECRET || "기본_세션_비밀키",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);

// Passport 초기화
app.use(passport.initialize());
app.use(passport.session());

// 카테고리 조회 라우트
app.get("/categories", async (req, res) => {
  try {
    const results = await queryDatabase(
      "SELECT id, name, image_url FROM categories"
    );
    res.json(results);
  } catch (error) {
    handleDatabaseError(res, error, "카테고리 조회 중 오류 발생:");
  }
});

// 추천 호텔 조회 라우트
app.get("/recommended-hotels", async (req, res) => {
  try {
    const results = await queryDatabase("SELECT * FROM recommended_hotels");
    res.json(results);
  } catch (error) {
    handleDatabaseError(res, error, "추천 호텔 조회 중 오류 발생:");
  }
});

// 인증 코드 요청 처리
app.post("/request-verification-code", async (req, res) => {
  const { email, password, birth } = req.body;

  if (!email || !password || !birth) {
    return res.status(400).json({ error: "모든 필드를 입력해야 합니다." });
  }

  try {
    const results = await queryDatabase(
      "SELECT * FROM yeogi_main WHERE email = ?",
      [email]
    );

    if (results.length > 0) {
      return res.status(409).json({ error: "이미 존재하는 이메일입니다." });
    }

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    await sendVerificationEmail(email, verificationCode);
    res.json({ message: "사용자 등록 성공", verificationCode });
  } catch (error) {
    handleDatabaseError(res, error, "인증 코드 요청 처리 중 오류 발생:");
  }
});

app.post("/register", async (req, res) => {
  const { email, password, birth, nickname, phone_number } = req.body;

  if (!email || !password || !birth || !nickname || !phone_number) {
    return res.status(400).json({ error: "모든 필드를 입력해야 합니다." });
  }

  try {
    const results = await queryDatabase(
      "SELECT * FROM yeogi_main WHERE email = ?",
      [email]
    );

    if (results.length > 0) {
      return res.status(409).json({ error: "이미 존재하는 이메일입니다." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await queryDatabase(
      "INSERT INTO yeogi_main (email, password, birth, nickname, phone_number) VALUES (?, ?, ?, ?, ?)",
      [email, hashedPassword, birth, nickname, phone_number]
    );

    res.json({ message: "사용자 등록 완료" });
  } catch (error) {
    handleDatabaseError(res, error, "사용자 등록 중 오류 발생:");
  }
});

// 카카오페이 결제 요청
app.post("/api/kakao-pay", authenticateToken, async (req, res) => {
  const { accommodationId, checkIn, checkOut, guests, totalPrice } = req.body;
  const userId = req.user.id;

  try {
    // 예약 정보 저장
    const bookingResult = await queryDatabase(
      "INSERT INTO bookings (user_id, accommodation_id, check_in_date, check_out_date, guests, total_price, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')",
      [userId, accommodationId, checkIn, checkOut, guests, totalPrice]
    );
    const bookingId = bookingResult.insertId;

    const response = await axios.post(
      "https://kapi.kakao.com/v1/payment/ready",
      {
        cid: process.env.KAKAO_CID,
        partner_order_id: bookingId.toString(),
        partner_user_id: userId.toString(),
        item_name: "여기어때 우신희",
        quantity: 1,
        total_amount: totalPrice,
        tax_free_amount: 0,
        approval_url: `${process.env.CLIENT_URL}/reservation/complete?booking_id=${bookingId}`,
        cancel_url: `${process.env.CLIENT_URL}/reservation/cancel?booking_id=${bookingId}`,
        fail_url: `${process.env.CLIENT_URL}/reservation/fail?booking_id=${bookingId}`,
      },
      {
        headers: {
          Authorization: `KakaoAK ${process.env.KAKAO_ADMIN_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
      }
    );

    const { tid } = response.data;

    // tid를 데이터베이스에 저장
    await queryDatabase("UPDATE bookings SET tid = ? WHERE id = ?", [
      tid,
      bookingId,
    ]);

    // 세션에 중요 정보 저장
    req.session.kakaopayTid = tid;
    req.session.bookingId = bookingId.toString();
    req.session.userId = userId.toString();

    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error("세션 저장 실패:", err);
          reject(err);
        } else {
          console.log("세션 저장 성공");
          resolve();
        }
      });
    });

    console.log("세션에 저장된 정보:", {
      kakaopayTid: req.session.kakaopayTid,
      bookingId: req.session.bookingId,
      userId: req.session.userId,
    });

    res.json({
      success: true,
      next_redirect_pc_url: response.data.next_redirect_pc_url,
      tid: tid,
    });
  } catch (error) {
    console.error("카카오페이 결제 요청 실패:", error);
    res.status(500).json({ error: "결제 요청 중 오류가 발생했습니다." });
  }
});

app.get("/api/kakao-pay/success", async (req, res) => {
  const { pg_token, booking_id } = req.query;
  console.log("Received request params:", { pg_token, booking_id });

  try {
    // 예약 정보와 숙소 정보를 함께 조회
    const [booking] = await queryDatabase(
      `
      SELECT 
        b.id,
        b.user_id,
        b.check_in_date as check_in,
        b.check_out_date as check_out,
        b.guests,
        b.total_price,
        b.status,
        b.payment_status,
        b.tid,
        a.id as accommodation_id,
        a.name as accommodation_name,
        a.image_url as accommodation_image
      FROM bookings b
      JOIN accommodations a ON b.accommodation_id = a.id
      WHERE b.id = ?
    `,
      [booking_id]
    );

    console.log("Database query result:", booking);

    if (!booking) {
      console.log("Booking not found");
      return res.status(404).json({ error: "예약 정보를 찾을 수 없습니다." });
    }

    // 이미 결제가 완료된 경우 추가 처리 없이 성공 응답
    if (booking.payment_status === "completed") {
      console.log("Payment already completed");
      return res.json({ success: true, booking: booking });
    }

    // tid가 없는 경우 에러 처리
    if (!booking.tid) {
      console.log("TID not found");
      return res.status(400).json({ error: "결제 정보(tid)가 없습니다." });
    }

    console.log("Sending approval request to KakaoPay");
    // 카카오페이 결제 승인 요청
    const approveResponse = await axios.post(
      "https://kapi.kakao.com/v1/payment/approve",
      {
        cid: process.env.KAKAO_CID,
        tid: booking.tid,
        partner_order_id: booking_id,
        partner_user_id: booking.user_id.toString(),
        pg_token,
      },
      {
        headers: {
          Authorization: `KakaoAK ${process.env.KAKAO_ADMIN_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
      }
    );

    console.log("KakaoPay approval response:", approveResponse.data);

    // 결제 승인 성공 시 예약 상태 업데이트
    await queryDatabase(
      "UPDATE bookings SET payment_status = 'completed', status = 'confirmed' WHERE id = ?",
      [booking_id]
    );
    console.log("Booking status updated");

    // 날짜 형식 변환
    booking.check_in = new Date(booking.check_in).toLocaleDateString();
    booking.check_out = new Date(booking.check_out).toLocaleDateString();

    console.log("Final booking data:", booking);
    res.json({ success: true, booking: booking });
  } catch (error) {
    console.error(
      "카카오페이 결제 승인 실패:",
      error.response ? error.response.data : error
    );
    res.status(500).json({ error: "결제 승인 중 오류가 발생했습니다." });
  }
});
// 임시 예약 정보 저장 함수
const saveBooking = async (
  userId,
  accommodationId,
  checkIn,
  checkOut,
  guests,
  totalPrice
) => {
  try {
    const query = `
      INSERT INTO bookings (user_id, accommodation_id, check_in_date, check_out_date, guests, total_price, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `;
    const result = await queryDatabase(query, [
      userId,
      accommodationId,
      checkIn,
      checkOut,
      guests,
      totalPrice,
    ]);
    return result.insertId;
  } catch (error) {
    console.error("예약 저장 중 오류:", error);
    throw error;
  }
};

// 예약 확정 함수
async function confirmBooking(bookingId) {
  const query = `
    UPDATE bookings
    SET payment_status = 'completed'
    WHERE id = ?
  `;
  await pool.query(query, [bookingId]);
}
const KAKAO_JAVASCRIPT_KEY = process.env.KAKAO_JAVASCRIPT_KEY;
const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
const KAKAO_REDIRECT_URI =
  process.env.KAKAO_REDIRECT_URI || "/auth/kakao/callback";

if (!KAKAO_JAVASCRIPT_KEY || !KAKAO_REST_API_KEY) {
  console.error(
    "KAKAO_JAVASCRIPT_KEY 또는 KAKAO_REST_API_KEY 환경 변수가 설정되지 않았습니다."
  );
  process.exit(1);
}

// Kakao 전략 설정
passport.use(
  new KakaoStrategy(
    {
      clientID: KAKAO_JAVASCRIPT_KEY,
      callbackURL: KAKAO_REDIRECT_URI,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("카카오 프로필 정보:", profile);

        if (!profile._json || !profile._json.kakao_account) {
          return done(new Error("kakao_account 정보가 필요합니다."), null);
        }

        const { email } = profile._json.kakao_account;
        const nickname = profile._json.properties?.nickname || "Unknown";
        const profileImage = profile._json.properties?.profile_image || null;

        if (!email) {
          return done(new Error("이메일이 필요합니다."), null);
        }

        const user = await saveOrUpdateKakaoUser(
          email,
          nickname,
          profileImage,
          profile.id
        );
        done(null, user);
      } catch (error) {
        done(error);
      }
    }
  )
);

async function saveOrUpdateKakaoUser(email, nickname, profileImage, kakaoId) {
  try {
    const results = await queryDatabase(
      "SELECT * FROM yeogi_main WHERE email = ?",
      [email]
    );

    if (results.length > 0) {
      await queryDatabase(
        "UPDATE yeogi_main SET nickname = ?, profile_image = ?, kakao_id = ? WHERE email = ?",
        [nickname, profileImage, kakaoId, email]
      );
      console.log("카카오 계정 정보 업데이트:", { email, nickname });
      return {
        ...results[0],
        nickname,
        profile_image: profileImage,
        kakao_id: kakaoId,
      };
    } else {
      const result = await queryDatabase(
        "INSERT INTO yeogi_main (email, password, kakao_id, nickname, profile_image) VALUES (?, ?, ?, ?, ?)",
        [email, "kakao-auth", kakaoId, nickname, profileImage]
      );
      const newUser = {
        id: result.insertId,
        email,
        kakao_id: kakaoId,
        nickname,
        profile_image: profileImage,
      };
      console.log("새 카카오 사용자 생성:", newUser);
      return newUser;
    }
  } catch (error) {
    console.error("카카오 사용자 저장/업데이트 중 오류:", error);
    throw error;
  }
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const results = await queryDatabase(
      "SELECT * FROM yeogi_main WHERE id = ?",
      [id]
    );
    done(null, results[0]);
  } catch (error) {
    done(error);
  }
});

app.get(
  "/auth/kakao",
  passport.authenticate("kakao", {
    scope: ["profile_nickname", "profile_image", "account_email"],
  })
);

app.get(
  "/auth/kakao/callback",
  passport.authenticate("kakao", { session: false }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.json({ token });
  }
);

app.get("/Yeogi", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      message: "Yeogi 페이지에 오신 것을 환영합니다!",
      user: req.user,
    });
  } else {
    res.status(401).json({ message: "로그인이 필요합니다." });
  }
});

app.get("/api/accommodations/search", async (req, res) => {
  console.log("Received request with query:", req.query);
  const { location, checkIn, checkOut, guests, type } = req.query;

  try {
    let query = `
      SELECT DISTINCT a.* 
      FROM accommodations a
      WHERE 1=1
    `;

    const params = [];

    if (location) {
      query += ` AND a.location LIKE ?`;
      params.push(`%${location}%`);
    }

    if (guests && !isNaN(guests)) {
      query += ` AND a.max_guests >= ?`;
      params.push(parseInt(guests, 10));
    }

    if (type) {
      query += ` AND a.type = ?`;
      params.push(type);
    }

    if (checkIn && checkOut) {
      query += `
        AND NOT EXISTS (
          SELECT 1
          FROM bookings b
          WHERE b.accommodation_id = a.id
            AND b.status != 'cancelled'
            AND (
              (b.check_in_date <= ? AND b.check_out_date > ?)
              OR (b.check_in_date < ? AND b.check_out_date >= ?)
              OR (? <= b.check_in_date AND ? > b.check_in_date)
            )
        )
      `;
      params.push(checkOut, checkIn, checkOut, checkOut, checkIn, checkOut);
    }

    console.log("Executing query:", query);
    console.log("Query parameters:", params);

    const results = await queryDatabase(query, params);
    console.log("Query results:", results);

    res.json(results);
  } catch (error) {
    console.error("숙소 검색 중 오류 발생:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
app.get("/accommodations/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const query = "SELECT * FROM accommodations WHERE id = ?";
    const results = await queryDatabase(query, [id]);

    if (results.length === 0) {
      return res.status(404).json({ error: "숙소를 찾을 수 없습니다." });
    }

    res.json(results[0]);
  } catch (error) {
    console.error("숙소 정보 조회 중 오류 발생:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
app.get("/api/bookings/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const query = `
      SELECT b.*, a.name as accommodation_name, a.image_url, a.location
      FROM bookings b
      JOIN accommodations a ON b.accommodation_id = a.id
      WHERE b.user_id = ?
      ORDER BY b.check_in_date DESC
    `;
    const bookings = await queryDatabase(query, [userId]);

    if (bookings.length > 0) {
      res.json(bookings);
    } else {
      res.json([]); // 예약이 없는 경우 빈 배열 반환
    }
  } catch (error) {
    console.error("예약 정보 조회 중 오류 발생:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
// 로그인 라우트
app.post("/api/login", async (req, res) => {
  try {
    console.log("로그인 요청 받음:", req.body);
    const { email, password } = req.body;

    console.log("사용자 조회 시작");
    const users = await queryDatabase(
      "SELECT id, email, password, nickname, phone_number FROM yeogi_main WHERE email = ?",
      [email]
    );
    console.log("사용자 조회 결과:", users);

    if (!users || users.length === 0) {
      console.log("사용자를 찾을 수 없음");
      return res
        .status(401)
        .json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
    }

    const user = users[0];
    console.log("비밀번호 검증 시작");
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log("비밀번호 검증 결과:", isValidPassword);

    if (!isValidPassword) {
      console.log("비밀번호가 일치하지 않음");
      return res
        .status(401)
        .json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
    }

    console.log("JWT 토큰 생성 시작");
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    console.log("JWT 토큰 생성 완료");

    res.json({
      message: "로그인 성공",
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        phone_number: user.phone_number,
      },
    });
  } catch (error) {
    console.error("로그인 처리 중 오류 발생:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
app.get("/api/user", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("Authenticated user:", req.user);

    const query = `
      SELECT a.* 
      FROM accommodations a 
      JOIN likes l ON a.id = l.accommodation_id 
      WHERE l.user_id = ?
      ORDER BY l.created_at DESC
    `;
    const likedAccommodations = await queryDatabase(query, [userId]);
    console.log("찜한 숙소 조회 결과:", likedAccommodations);

    res.json({
      id: req.user.id,
      email: req.user.email,
      likedAccommodations: likedAccommodations,
    });
  } catch (error) {
    console.error("사용자 정보 및 찜 목록 조회 중 오류 발생:", error);
    console.error(error.stack);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
app.get("/api/likes/check/:userId/:accommodationId", async (req, res) => {
  try {
    const { userId, accommodationId } = req.params;
    console.log(
      "Checking like status for userId:",
      userId,
      "accommodationId:",
      accommodationId
    );

    const query =
      "SELECT * FROM likes WHERE user_id = ? AND accommodation_id = ?";
    const likes = await queryDatabase(query, [userId, accommodationId]);

    console.log("Query result:", likes);

    res.json({ isLiked: likes.length > 0 });
  } catch (error) {
    console.error("찜 상태 확인 중 오류 발생:", error);
    console.error(error.stack); // 스택 트레이스 출력
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
app.post("/api/likes", async (req, res) => {
  console.log("Request body:", req.body);
  const { userId, accommodationId } = req.body;
  if (!userId || !accommodationId) {
    return res
      .status(400)
      .json({ error: "userId와 accommodationId가 필요합니다." });
  }
  try {
    // 먼저 이미 존재하는지 확인
    const checkQuery =
      "SELECT * FROM likes WHERE user_id = ? AND accommodation_id = ?";
    const existingLikes = await queryDatabase(checkQuery, [
      userId,
      accommodationId,
    ]);

    console.log("Existing likes:", existingLikes);

    if (existingLikes && existingLikes.length > 0) {
      // 이미 찜한 경우
      return res.json({ message: "이미 찜한 숙소입니다." });
    }

    // 존재하지 않는 경우에만 삽입
    const insertQuery =
      "INSERT INTO likes (user_id, accommodation_id) VALUES (?, ?)";
    await queryDatabase(insertQuery, [userId, accommodationId]);
    res.json({ message: "찜하기 성공" });
  } catch (error) {
    console.error("찜하기 추가 중 오류 발생:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

app.post("/api/kakao-login", async (req, res) => {
  try {
    const { email } = req.body;
    console.log("Received email:", email);

    // 사용자 확인 또는 생성 로직
    let user = await queryDatabase("SELECT * FROM yeogi_main WHERE email = ?", [
      email,
    ]);

    if (!user || user.length === 0) {
      // 사용자가 없으면 새로 생성
      const result = await queryDatabase(
        "INSERT INTO yeogi_main (email, password) VALUES (?, ?)",
        [email, "kakao-auth"]
      );
      user = { id: result.insertId, email };
    } else {
      user = user[0]; // 첫 번째 사용자 선택
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token });
  } catch (error) {
    console.error("카카오 로그인 처리 중 오류:", error);
    res.status(500).json({
      error: "서버 오류가 발생했습니다.",
      details: error.message,
    });
  }
});

// 예약 정보 저장
app.post("/api/reservations", async (req, res) => {
  const { accommodationId, checkIn, checkOut, guests } = req.body;
  const userId = req.user.id; // JWT 토큰에서 사용자 ID 추출

  try {
    const query = `
      INSERT INTO reservations (user_id, accommodation_id, check_in, check_out, guests)
      VALUES (?, ?, ?, ?, ?)
    `;
    await queryDatabase(query, [
      userId,
      accommodationId,
      checkIn,
      checkOut,
      guests,
    ]);
    res.json({ success: true });
  } catch (error) {
    console.error("예약 저장 중 오류 발생:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 사용자의 예약 목록 조회
app.get("/api/reservations", async (req, res) => {
  const userId = req.user.id; // JWT 토큰에서 사용자 ID 추출

  try {
    const query = `
      SELECT r.*, a.name, a.image_url, a.location
      FROM reservations r
      JOIN accommodations a ON r.accommodation_id = a.id
      WHERE r.user_id = ?
    `;
    const results = await queryDatabase(query, [userId]);
    res.json(results);
  } catch (error) {
    console.error("예약 목록 조회 중 오류 발생:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
app.set("trust proxy", 1);
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
//------------------------------------------------------------------------관리자 페이지
app.post("/api/admin/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [admin] = await queryDatabase(
      "SELECT * FROM admin_users WHERE email = ?",
      [email]
    );

    if (!admin) {
      return res.status(401).json({ error: "관리자 계정이 아닙니다." });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ error: "비밀번호가 일치하지 않습니다." });
    }

    // token 생성을 여기로 이동
    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 숙소 등록 여부 확인
    const [accommodations] = await queryDatabase(
      "SELECT COUNT(*) as count FROM accommodations WHERE admin_id = ?",
      [admin.id]
    );

    const hasAccommodations = accommodations.count > 0;

    res.json({
      token,
      adminId: admin.id,
      name: admin.name,
      hasAccommodations,
    });
  } catch (error) {
    console.error("관리자 로그인 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
app.get("/api/admin/dashboard", authenticateToken, async (req, res) => {
  try {
    // 체크인/체크아웃 데이터, 총 예약 수, 이번 달 매출, 평균 숙박 일수 조회
    const [dashboardStats] = await queryDatabase(
      `
  SELECT 
    SUM(CASE WHEN DATE(b.check_in_date) = CURDATE() THEN 1 ELSE 0 END) as today_check_ins,
    SUM(CASE WHEN DATE(b.check_out_date) = CURDATE() THEN 1 ELSE 0 END) as today_check_outs,
    COUNT(*) as total_bookings,
    SUM(CASE WHEN MONTH(b.check_in_date) = MONTH(CURDATE()) AND YEAR(b.check_in_date) = YEAR(CURDATE()) THEN b.total_price ELSE 0 END) as monthly_revenue,
    AVG(DATEDIFF(b.check_out_date, b.check_in_date)) as average_stay_duration
  FROM bookings b
  JOIN accommodations a ON b.accommodation_id = a.id
  WHERE a.admin_id = ?
  `,
      [req.user.id]
    );

    console.log("Dashboard stats:", dashboardStats);

    // 최근 예약 데이터 조회 (이메일과 닉네임 포함)
    const recentBookings = await queryDatabase(
      `
      SELECT b.id, a.name as accommodation_name, b.check_in_date, b.check_out_date,
             u.email, u.nickname, u.phone_number
      FROM bookings b
      JOIN accommodations a ON b.accommodation_id = a.id
      JOIN yeogi_main u ON b.user_id = u.id
      WHERE a.admin_id = ?
      ORDER BY b.created_at DESC
      LIMIT 5
    `,
      [req.user.id]
    );

    console.log("Recent bookings:", recentBookings); // 로그 추가

    // 이번 달 일별 매출 데이터 조회
    const dailyRevenue = await queryDatabase(
      `
  SELECT DATE(b.check_in_date) as date, 
         SUM(b.total_price) as revenue
  FROM bookings b
  JOIN accommodations a ON b.accommodation_id = a.id
  WHERE a.admin_id = ?
    AND YEAR(b.check_in_date) = YEAR(CURDATE())
    AND MONTH(b.check_in_date) = MONTH(CURDATE())
  GROUP BY DATE(b.check_in_date)
  ORDER BY DATE(b.check_in_date)
  `,
      [req.user.id]
    );

    console.log("Daily revenue data:", dailyRevenue);

    // 결과 합치기
    const dashboardData = {
      today_check_ins: Number(dashboardStats.today_check_ins) || 0,
      today_check_outs: Number(dashboardStats.today_check_outs) || 0,
      total_bookings: Number(dashboardStats.total_bookings) || 0,
      monthly_revenue: Number(dashboardStats.monthly_revenue) || 0,
      average_stay_duration: Number(dashboardStats.average_stay_duration) || 0,
      recentBookings,
      dailyRevenue,
    };

    console.log("Full dashboard data:", dashboardData);

    res.json({
      today_check_ins: Number(dashboardStats.today_check_ins) || 0,
      today_check_outs: Number(dashboardStats.today_check_outs) || 0,
      total_bookings: Number(dashboardStats.total_bookings) || 0,
      monthly_revenue: Number(dashboardStats.monthly_revenue) || 0,
      average_stay_duration: Number(dashboardStats.average_stay_duration) || 0,
      recentBookings,
      dailyRevenue,
    });
  } catch (error) {
    console.error("대시보드 데이터 조회 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
app.post("/api/admin/register", async (req, res) => {
  const { email, password, name } = req.body;

  try {
    // 이메일 중복 체크
    const [existingAdmin] = await queryDatabase(
      "SELECT * FROM admin_users WHERE email = ?",
      [email]
    );

    if (existingAdmin) {
      return res.status(400).json({ error: "이미 존재하는 이메일입니다." });
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // 관리자 계정 생성
    const result = await queryDatabase(
      "INSERT INTO admin_users (email, password, name) VALUES (?, ?, ?)",
      [email, hashedPassword, name]
    );

    res.status(201).json({
      message: "관리자 계정이 생성되었습니다.",
      adminId: result.insertId,
    });
  } catch (error) {
    console.error("관리자 회원가입 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
app.get(
  "/api/admin/check-accommodation",
  authenticateToken,
  async (req, res) => {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: "관리자 권한이 없습니다." });
    }

    try {
      const [accommodation] = await queryDatabase(
        "SELECT * FROM accommodations WHERE admin_id = ? LIMIT 1",
        [req.user.id]
      );

      if (accommodation) {
        res.json({ hasAccommodation: true });
      } else {
        res.json({ hasAccommodation: false });
      }
    } catch (error) {
      console.error("숙소 확인 오류:", error);
      res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
  }
);
app.post(
  "/api/admin/register-accommodation",
  authenticateToken,
  async (req, res) => {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: "관리자 권한이 없습니다." });
    }

    const {
      name,
      location,
      price,
      max_guests,
      description,
      image_url,
      available_from,
      available_to,
      latitude,
      longitude,
    } = req.body;

    try {
      const result = await queryDatabase(
        "INSERT INTO accommodations (name, location, price, max_guests, description, image_url, available_from, available_to, latitude, longitude, admin_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          name,
          location,
          price,
          max_guests,
          description,
          image_url,
          available_from,
          available_to,
          latitude,
          longitude,
          req.user.id,
        ]
      );

      res.status(201).json({
        message: "숙소가 등록되었습니다.",
        accommodationId: result.insertId,
      });
    } catch (error) {
      console.error("숙소 등록 오류:", error);
      res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
  }
);
// 숙소 정보 조회 및 수정
// 관리자의 모든 숙소 정보를 가져오는 엔드포인트
app.get("/api/admin/accommodations", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "관리자 권한이 없습니다." });
  }

  try {
    const accommodations = await queryDatabase(
      "SELECT * FROM accommodations WHERE admin_id = ?",
      [req.user.id]
    );

    if (accommodations.length === 0) {
      return res.status(404).json({ error: "등록된 숙소가 없습니다." });
    }

    res.json(accommodations);
  } catch (error) {
    console.error("숙소 정보 조회 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 특정 숙소 정보를 수정하는 엔드포인트
app.put("/api/admin/accommodation/:id", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "관리자 권한이 없습니다." });
  }

  const { id } = req.params;
  const { name, location, price, max_guests, description } = req.body;

  try {
    // 현재 날짜 이후의 예약이 있는지 확인
    const futureBookings = await queryDatabase(
      "SELECT COUNT(*) as count FROM bookings WHERE accommodation_id = ? AND check_in_date > CURDATE()",
      [id]
    );

    // 업데이트 쿼리 실행
    const result = await queryDatabase(
      "UPDATE accommodations SET name = ?, location = ?, price = ?, max_guests = ?, description = ? WHERE id = ? AND admin_id = ?",
      [name, location, price, max_guests, description, id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "해당 숙소를 찾을 수 없거나 수정 권한이 없습니다." });
    }

    // 응답 메시지 설정
    let message = "숙소 정보가 업데이트되었습니다.";
    if (futureBookings[0].count > 0) {
      message += " 단, 이미 예약된 건에 대해서는 변경사항이 적용되지 않습니다.";
    }

    res.json({ message, futureBookingsExist: futureBookings[0].count > 0 });
  } catch (error) {
    console.error("숙소 정보 수정 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 예약 관리
app.get("/api/admin/bookings", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "관리자 권한이 없습니다." });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const [bookings, [totalCount]] = await Promise.all([
      queryDatabase(
        `SELECT b.id, b.check_in_date, b.check_out_date, b.guests, 
                u.email, u.nickname, u.phone_number, a.name as accommodation_name
         FROM bookings b
         JOIN yeogi_main u ON b.user_id = u.id
         JOIN accommodations a ON b.accommodation_id = a.id
         WHERE a.admin_id = ?
         ORDER BY b.created_at DESC
         LIMIT ? OFFSET ?`,
        [req.user.id, limit, offset]
      ),
      queryDatabase(
        "SELECT COUNT(*) as count FROM bookings b JOIN accommodations a ON b.accommodation_id = a.id WHERE a.admin_id = ?",
        [req.user.id]
      ),
    ]);

    console.log("Bookings from database:", bookings); // 로그 추가

    res.json({
      bookings: bookings,
      totalPages: Math.ceil(totalCount.count / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("예약 목록 조회 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
app.delete("/api/admin/bookings/:id", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "관리자 권한이 없습니다." });
  }

  const bookingId = req.params.id;

  try {
    const result = await queryDatabase(
      "DELETE FROM bookings WHERE id = ? AND accommodation_id IN (SELECT id FROM accommodations WHERE admin_id = ?)",
      [bookingId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "예약을 찾을 수 없거나 삭제 권한이 없습니다." });
    }

    res.json({ message: "예약이 성공적으로 삭제되었습니다." });
  } catch (error) {
    console.error("예약 삭제 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
