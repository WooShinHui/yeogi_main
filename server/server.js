const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const cors = require("cors");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const KakaoStrategy = require("passport-kakao").Strategy;
const session = require("express-session");
const { format } = require("date-fns");
require("dotenv").config({ path: "./kakao.env" });
const jwt = require("jsonwebtoken");
const app = express();
const axios = require("axios");
const PORT = process.env.PORT || 3001;
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

console.log("환경변수 로드 시도");
console.log("KAKAO_JAVASCRIPT_KEY:", process.env.KAKAO_JAVASCRIPT_KEY);
console.log("KAKAO_REST_API_KEY:", process.env.KAKAO_REST_API_KEY);
console.log("현재 작업 디렉토리:", process.cwd());
console.log("kakao.env 경로:", require("path").resolve("./kakao.env"));
// 환경 변수 설정
const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "Yeogi_main",
};

const uploadsDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log("Saving file to:", uploadsDir); // 디버깅을 위한 로그 추가
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueFilename = Date.now() + path.extname(file.originalname);
    console.log("Generated filename:", uniqueFilename); // 디버깅을 위한 로그 추가
    cb(null, uniqueFilename);
  },
});
const upload = multer({ storage: storage });
const EMAIL_CONFIG = {
  host: "smtp.naver.com",
  port: 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  secure: false,
};
const transporter = nodemailer.createTransport(EMAIL_CONFIG);
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 60000, // 타임아웃 60초로 증가
  acquireTimeout: 60000,
});
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 관리자 코드 생성 함수
function generateAdminCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}
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
    origin: "http://teamproject.com.s3-website.ap-northeast-2.amazonaws.com",
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

// 정적 파일 제공을 위한 미들웨어 설정
app.use(express.static(path.join(__dirname, "public")));
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
// 이메일 중복 체크 함수
// 이메일 중복 체크 함수
async function checkEmailExists(email) {
  try {
    const results = await queryDatabase(
      "SELECT * FROM yeogi_main WHERE email = ?",
      [email]
    );
    return results.length > 0;
  } catch (error) {
    console.error("이메일 중복 체크 중 오류 발생:", error);
    throw error;
  }
}

app.post("/request-verification-code", async (req, res) => {
  const { email, password, birth, nickname, phoneNumber } = req.body;

  if (!email || !password || !birth || !nickname || !phoneNumber) {
    return res.status(400).json({ error: "모든 필드를 입력해야 합니다." });
  }

  try {
    const emailExists = await checkEmailExists(email);
    console.log("이메일 존재 여부:", emailExists); // 디버깅을 위한 로그

    if (emailExists) {
      return res.status(409).json({ error: "이미 존재하는 이메일입니다." });
    }

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    await sendVerificationEmail(email, verificationCode);
    res.json({ message: "인증 코드 전송 성공", verificationCode });
  } catch (error) {
    console.error("인증 코드 요청 처리 중 오류 발생:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// register 엔드포인트도 비슷하게 수정

app.post("/register", async (req, res) => {
  const { email, password, birth, nickname, phoneNumber } = req.body;

  if (!email || !password || !birth || !nickname || !phoneNumber) {
    return res.status(400).json({ error: "모든 필드를 입력해야 합니다." });
  }

  try {
    if (await checkEmailExists(email)) {
      return res.status(409).json({ error: "이미 존재하는 이메일입니다." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await queryDatabase(
      "INSERT INTO yeogi_main (email, password, birth, nickname, phone_number) VALUES (?, ?, ?, ?, ?)",
      [email, hashedPassword, birth, nickname, phoneNumber]
    );

    res.json({ message: "사용자 등록 완료" });
  } catch (error) {
    handleDatabaseError(res, error, "사용자 등록 중 오류 발생:");
  }
});
// 리뷰 작성
app.post("/api/reviews", authenticateToken, async (req, res) => {
  const { accommodation_id, booking_id, rating, comment } = req.body;
  const user_id = req.user.id;

  console.log("Received review data:", req.body);

  if (!accommodation_id || !booking_id || !rating || !comment) {
    return res.status(400).json({ error: "모든 필드를 입력해주세요." });
  }

  try {
    // 예약 확인 및 체크아웃 날짜 확인
    const [booking] = await queryDatabase(
      "SELECT * FROM bookings WHERE id = ? AND user_id = ? AND status = 'confirmed' AND payment_status = 'completed' AND check_out_date < CURDATE()",
      [booking_id, user_id]
    );

    if (!booking) {
      return res.status(400).json({ error: "유효하지 않은 예약입니다." });
    }

    // 리뷰 작성
    const result = await queryDatabase(
      "INSERT INTO reviews (accommodation_id, user_id, booking_id, rating, comment) VALUES (?, ?, ?, ?, ?)",
      [accommodation_id, user_id, booking_id, rating, comment]
    );

    res
      .status(201)
      .json({ message: "리뷰가 작성되었습니다.", id: result.insertId });
  } catch (error) {
    console.error("리뷰 작성 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 숙소의 리뷰 조회
app.get("/api/accommodations/:id/reviews", async (req, res) => {
  const { id } = req.params;
  try {
    const reviews = await queryDatabase(
      `SELECT r.*, u.nickname, u.profile_image 
       FROM reviews r 
       JOIN yeogi_main u ON r.user_id = u.id 
       WHERE r.accommodation_id = ? 
       ORDER BY r.created_at DESC`,
      [id]
    );
    res.json(reviews);
  } catch (error) {
    console.error("리뷰 조회 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 사용자의 리뷰 작성 가능한 숙소 목록
app.get(
  "/api/user/reviewable-accommodations",
  authenticateToken,
  async (req, res) => {
    const user_id = req.user.id;
    try {
      const accommodations = await queryDatabase(
        `SELECT DISTINCT a.*, b.id as booking_id, b.check_out_date
         FROM accommodations a
         JOIN bookings b ON a.id = b.accommodation_id
         LEFT JOIN reviews r ON b.id = r.booking_id
         WHERE b.user_id = ? 
           AND b.payment_status = 'completed' 
           AND b.status = 'confirmed'
           AND b.check_out_date < CURDATE()
           AND r.id IS NULL`,
        [user_id]
      );
      res.json(accommodations);
    } catch (error) {
      console.error("리뷰 가능한 숙소 조회 오류:", error);
      res
        .status(500)
        .json({ error: "서버 오류가 발생했습니다.", details: error.message });
    }
  }
);
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

  // req.query.location이 객체인 경우를 처리
  const { location, checkIn, checkOut, guests, type } =
    typeof req.query.location === "object" ? req.query.location : req.query;

  console.log("Parsed query parameters:", {
    location,
    checkIn,
    checkOut,
    guests,
    type,
  });

  try {
    let query = `
      SELECT DISTINCT a.* 
      FROM accommodations a
      LEFT JOIN bookings b ON a.id = b.accommodation_id AND b.status != 'cancelled'
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
        AND (
          b.id IS NULL OR
          (b.check_out_date <= ? OR b.check_in_date >= ?)
        )
      `;
      params.push(checkIn, checkOut);
    }

    query += `
      GROUP BY a.id
      HAVING COUNT(CASE WHEN b.id IS NOT NULL AND b.check_out_date > ? AND b.check_in_date < ? THEN 1 END) = 0
    `;

    if (checkIn && checkOut) {
      params.push(checkIn, checkOut);
    } else {
      params.push(null, null);
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
    // 숙소 정보 조회
    const accommodationQuery = "SELECT * FROM accommodations WHERE id = ?";
    const accommodationResults = await queryDatabase(accommodationQuery, [id]);

    if (accommodationResults.length === 0) {
      return res.status(404).json({ error: "숙소를 찾을 수 없습니다." });
    }

    const accommodation = accommodationResults[0];

    // 예약 정보 조회
    const bookingsQuery = `
      SELECT check_in_date, check_out_date 
      FROM bookings 
      WHERE accommodation_id = ? AND status != 'cancelled' AND check_out_date >= CURDATE()
    `;
    const bookingsResults = await queryDatabase(bookingsQuery, [id]);

    // 숙소 정보에 예약 정보 추가
    accommodation.bookings = bookingsResults.map((booking) => ({
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
    }));

    res.json(accommodation);
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
// 서버 측 코드 (예시)
app.get("/api/bookings/check/:accommodationId", (req, res) => {
  const { accommodationId } = req.params;
  const { checkIn, checkOut } = req.query;

  // 데이터베이스에서 해당 숙소의 예약 정보를 확인
  const query = `
    SELECT COUNT(*) as count
    FROM bookings
    WHERE accommodation_id = ?
    AND ((check_in_date <= ? AND check_out_date > ?)
    OR (check_in_date < ? AND check_out_date >= ?)
    OR (check_in_date >= ? AND check_out_date <= ?))
  `;

  db.query(
    query,
    [accommodationId, checkOut, checkIn, checkOut, checkIn, checkIn, checkOut],
    (err, results) => {
      if (err) {
        res.status(500).json({ error: "예약 확인 중 오류 발생" });
      } else {
        res.json({ isAvailable: results[0].count === 0 });
      }
    }
  );
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
//------------------------------------------------------------------------관리자 페이지---------------------------------------------------------------
// ... 기존 코드 ...
// 관리자 프로필 정보 조회
app.get("/api/admin/profile", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "관리자 권한이 없습니다." });
  }

  try {
    const [adminInfo] = await queryDatabase(
      "SELECT id, email, name, phone_number, position, profile_image FROM admin_users WHERE id = ?",
      [req.user.id]
    );

    if (!adminInfo) {
      return res.status(404).json({ error: "관리자 정보를 찾을 수 없습니다." });
    }

    res.json(adminInfo);
  } catch (error) {
    console.error("관리자 프로필 조회 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 관리자 프로필 이미지 업데이트
app.put(
  "/api/admin/profile/image",
  authenticateToken,
  upload.single("profile_image"),
  async (req, res) => {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: "관리자 권한이 없습니다." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "이미지 파일이 없습니다." });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    try {
      // 기존 프로필 이미지가 있다면 삭제
      const [admin] = await queryDatabase(
        "SELECT profile_image FROM admin_users WHERE id = ?",
        [req.user.id]
      );

      if (
        admin.profile_image &&
        !admin.profile_image.includes("default-profile")
      ) {
        const oldImagePath = path.join(
          __dirname,
          "public",
          admin.profile_image
        );
        fs.unlink(oldImagePath, (err) => {
          if (err) console.error("기존 이미지 삭제 실패:", err);
        });
      }

      // 데이터베이스 업데이트
      await queryDatabase(
        "UPDATE admin_users SET profile_image = ? WHERE id = ?",
        [imageUrl, req.user.id]
      );

      res.json({
        message: "프로필 이미지가 업데이트되었습니다.",
        profile_image: imageUrl,
      });
    } catch (error) {
      console.error("프로필 이미지 업데이트 실패:", error);
      res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
  }
);
app.delete("/api/admin/reviews/:id", authenticateToken, async (req, res) => {
  try {
    const reviewId = req.params.id;

    // 리뷰 존재 여부 확인
    const checkQuery = "SELECT * FROM reviews WHERE id = ?";
    const checkResult = await queryDatabase(checkQuery, [reviewId]);

    if (checkResult.length === 0) {
      return res.status(404).json({ message: "리뷰를 찾을 수 없습니다." });
    }

    // 리뷰 삭제 쿼리 실행
    const deleteQuery = "DELETE FROM reviews WHERE id = ?";
    const deleteResult = await queryDatabase(deleteQuery, [reviewId]);

    console.log("Delete query result:", deleteResult); // 디버깅을 위한 로그 추가

    res.json({
      message: "리뷰가 성공적으로 삭제되었습니다.",
      deletedReview: checkResult[0],
    });
  } catch (error) {
    console.error("리뷰 삭제 중 오류 발생:", error);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});
// 문의 테이블 생성 쿼리
const createInquiriesTableQuery = `
CREATE TABLE IF NOT EXISTS inquiries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES yeogi_main(id)
)`;

// 문의 등록 API
// 사용자의 문의 내역 조회
app.get("/api/inquiries", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      SELECT * FROM inquiries 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `;
    const inquiries = await queryDatabase(query, [userId]);
    res.json(inquiries);
  } catch (error) {
    console.error("문의 내역 조회 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
app.post("/api/inquiries", authenticateToken, async (req, res) => {
  const { title, content } = req.body;
  const userId = req.user.id;

  try {
    await queryDatabase(
      "INSERT INTO inquiries (user_id, title, content) VALUES (?, ?, ?)",
      [userId, title, content]
    );
    res.status(201).json({ message: "문의가 등록되었습니다." });
  } catch (error) {
    console.error("문의 등록 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 관리자용 문의 목록 조회 API
// 문의 목록 조회 API
app.get("/api/admin/inquiries", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "관리자 권한이 없습니다." });
  }

  try {
    const inquiries = await queryDatabase(
      `SELECT i.*, y.email as user_email 
       FROM inquiries i 
       JOIN yeogi_main y ON i.user_id = y.id 
       ORDER BY i.created_at DESC`
    );

    console.log("조회된 문의:", inquiries); // 디버깅용 로그
    res.json({ inquiries });
  } catch (error) {
    console.error("문의 조회 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
// ... existing code ...

// 관리자용 문의 답변 API
app.post(
  "/api/admin/inquiries/:id/answer",
  authenticateToken,
  async (req, res) => {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: "관리자 권한이 없습니다." });
    }

    const inquiryId = req.params.id;
    const { response } = req.body;

    try {
      // 답변 업데이트 및 상태 변경
      await queryDatabase(
        `UPDATE inquiries 
       SET response = ?, 
           status = 'answered', 
           response_date = NOW() 
       WHERE id = ?`,
        [response, inquiryId]
      );

      res.json({ message: "답변이 등록되었습니다." });
    } catch (error) {
      console.error("문의 답변 등록 오류:", error);
      res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
  }
);
app.post("/api/admin/login", async (req, res) => {
  const { email, password, adminCode } = req.body;

  try {
    // 이메일과 관리자 코드로 관리자 정보 조회
    const [admin] = await queryDatabase(
      "SELECT * FROM admin_users WHERE email = ? AND admin_code = ?",
      [email, adminCode]
    );

    if (!admin) {
      return res
        .status(401)
        .json({ error: "이메일 또는 관리자 코드가 올바르지 않습니다." });
    }

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "비밀번호가 올바르지 않습니다." });
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      { id: admin.id, email: admin.email, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, adminId: admin.id, name: admin.name });
  } catch (error) {
    console.error("관리자 로그인 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
app.get("/api/admin/dashboard", authenticateToken, async (req, res) => {
  try {
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
    // 오늘의 예약 수 조회 쿼리 수정
    // 오늘의 예약 수 조회 쿼리 수정 및 로그 추가
    const todayBookings = await queryDatabase(
      `SELECT COUNT(*) as today_bookings 
   FROM bookings b
   JOIN accommodations a ON b.accommodation_id = a.id
   WHERE DATE(b.created_at) = CURDATE() 
   AND b.payment_status = 'completed'
   AND a.admin_id = ?`,
      [req.user.id]
    );

    console.log("Today Bookings Query Result:", todayBookings);
    console.log(
      "Created_at dates in bookings:",
      await queryDatabase(
        `SELECT created_at, payment_status 
   FROM bookings b
   JOIN accommodations a ON b.accommodation_id = a.id
   WHERE a.admin_id = ?
   ORDER BY created_at DESC
   LIMIT 5`,
        [req.user.id]
      )
    );

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

    const popularAccommodations = await queryDatabase(
      `
      SELECT a.id, a.name, COUNT(l.id) as likes_count
      FROM accommodations a
      LEFT JOIN likes l ON a.id = l.accommodation_id
      WHERE a.admin_id = ?
      GROUP BY a.id
      ORDER BY likes_count DESC
      LIMIT 5
      `,
      [req.user.id]
    );

    const recentReviews = await queryDatabase(
      `
      SELECT r.*, a.name as accommodation_name, u.nickname
      FROM reviews r
      JOIN accommodations a ON r.accommodation_id = a.id
      JOIN yeogi_main u ON r.user_id = u.id
      WHERE a.admin_id = ?
      ORDER BY r.created_at DESC
      LIMIT 5
    `,
      [req.user.id]
    );

    const dailyCheckIns = await queryDatabase(
      `
      SELECT DATE(b.check_in_date) as date, 
             COUNT(*) as check_ins
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

    const [averageRating] = await queryDatabase(
      `
      SELECT AVG(rating) as average_rating
      FROM reviews r
      JOIN accommodations a ON r.accommodation_id = a.id
      WHERE a.admin_id = ?
      `,
      [req.user.id]
    );
    // dailyCheckOuts 쿼리 추가
    const dailyCheckOuts = await queryDatabase(
      `
  SELECT DATE(b.check_out_date) as date, 
         COUNT(*) as check_outs
  FROM bookings b
  JOIN accommodations a ON b.accommodation_id = a.id
  WHERE a.admin_id = ?
    AND YEAR(b.check_out_date) = YEAR(CURDATE())
    AND MONTH(b.check_out_date) = MONTH(CURDATE())
  GROUP BY DATE(b.check_out_date)
  ORDER BY DATE(b.check_out_date)
  `,
      [req.user.id]
    );
    const recentInquiries = await queryDatabase(
      `SELECT i.*, u.email, u.nickname 
       FROM inquiries i 
       JOIN yeogi_main u ON i.user_id = u.id 
       ORDER BY i.created_at DESC 
       LIMIT 5`
    );
    // dashboardData에 dailyCheckOuts 추가
    const dashboardData = {
      today_check_ins: Number(dashboardStats.today_check_ins) || 0,
      today_check_outs: Number(dashboardStats.today_check_outs) || 0,
      total_bookings: Number(dashboardStats.total_bookings) || 0,
      monthly_revenue: Number(dashboardStats.monthly_revenue) || 0,
      average_stay_duration: Number(dashboardStats.average_stay_duration) || 0,
      recentBookings,
      dailyRevenue,
      dailyCheckIns,
      dailyCheckOuts,
      popularAccommodations,
      recentReviews,
      averageRating: Number(averageRating.average_rating) || 0,
      recentInquiries, // 최근 문의 데이터 추가
      todayBookings: Number(todayBookings[0].today_bookings) || 0,
    };

    res.json(dashboardData);
  } catch (error) {
    console.error("대시보드 데이터 조회 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
app.get("/api/admin/reviews", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "관리자 권한이 없습니다." });
  }

  try {
    const reviews = await queryDatabase(
      `SELECT r.id, r.accommodation_id, r.user_id, r.rating, 
              r.comment as content, r.created_at, 
              a.name as accommodation_name, u.nickname, u.email
       FROM reviews r
       JOIN accommodations a ON r.accommodation_id = a.id
       JOIN yeogi_main u ON r.user_id = u.id
       WHERE a.admin_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    res.json({ reviews });
  } catch (error) {
    console.error("리뷰 목록 조회 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
// 관리자 메시지 조회 API
app.get("/api/admin/messages", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "관리자 권한이 없습니다." });
  }

  try {
    const messages = await queryDatabase(
      `SELECT message FROM admin_messages ORDER BY created_at DESC LIMIT 10`
    );
    res.json(messages.map((msg) => msg.message));
  } catch (error) {
    console.error("관리자 메시지 조회 오류:", error); // 오류 로그 추가
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
// 관리자 메모 저장 API
app.post("/api/admin/notes", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "관리자 권한이 없습니다." });
  }

  const { message } = req.body;
  const adminId = req.user.id; // JWT 토큰에서 가져온 관리자 ID 사용

  try {
    // admin_users 테이블에서 관리자 정보 조회
    const [adminInfo] = await queryDatabase(
      "SELECT name, position FROM admin_users WHERE id = ?",
      [adminId]
    );

    if (!adminInfo) {
      return res.status(404).json({ error: "관리자 정보를 찾을 수 없습니다." });
    }

    await queryDatabase(
      `INSERT INTO admin_messages (message, admin_id, author_name, author_position) 
       VALUES (?, ?, ?, ?)`,
      [message, adminId, adminInfo.name, adminInfo.position]
    );

    res.status(201).json({ message: "메모가 저장되었습니다." });
  } catch (error) {
    console.error("메모 저장 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 관리자 메모 조회 API
app.get("/api/admin/notes", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "관리자 권한이 없습니다." });
  }

  try {
    const notes = await queryDatabase(
      `SELECT m.message, m.created_at, u.name AS author_name, u.position AS author_position
       FROM admin_messages m
       JOIN admin_users u ON m.admin_id = u.id
       ORDER BY m.created_at ASC` // DESC를 ASC로 변경
    );
    res.json(notes);
  } catch (error) {
    console.error("메모 조회 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
// 특정 리뷰 삭제
app.delete("/api/admin/reviews/:id", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "관리자 권한이 없습니다." });
  }

  const reviewId = req.params.id;

  try {
    const result = await queryDatabase(
      `DELETE r FROM reviews r
       JOIN accommodations a ON r.accommodation_id = a.id
       WHERE r.id = ? AND a.admin_id = ?`,
      [reviewId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "리뷰를 찾을 수 없거나 삭제 권한이 없습니다." });
    }

    res.json({ message: "리뷰가 성공적으로 삭제되었습니다." });
  } catch (error) {
    console.error("리뷰 삭제 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
// 모든 사용자 정보 조회
app.get("/api/admin/users", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "관리자 권한이 없습니다." });
  }

  try {
    const users = await queryDatabase(
      `SELECT id, email, nickname, profile_image, phone_number, 
              IFNULL(DATE_FORMAT(birth, '%Y-%m-%d'), '') as birth,
              IFNULL(DATE_FORMAT(created_at, '%Y-%m-%d'), '') as created_at,
              IFNULL(DATE_FORMAT(last_login, '%Y-%m-%d'), '') as last_login
       FROM yeogi_main`
    );

    res.json({ users });
  } catch (error) {
    console.error("사용자 목록 조회 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 특정 사용자 삭제
app.delete("/api/admin/users/:id", authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: "관리자 권한이 없습니다." });
  }

  const userId = req.params.id;

  try {
    // 사용자와 관련된 데이터 삭제 (예: 예약, 리뷰, 찜 목록 등)
    await queryDatabase("DELETE FROM bookings WHERE user_id = ?", [userId]);
    await queryDatabase("DELETE FROM reviews WHERE user_id = ?", [userId]);
    await queryDatabase("DELETE FROM likes WHERE user_id = ?", [userId]);

    // 사용자 삭제
    const result = await queryDatabase("DELETE FROM yeogi_main WHERE id = ?", [
      userId,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }

    res.json({ message: "사용자가 성공적으로 삭제되었습니다." });
  } catch (error) {
    console.error("사용자 삭제 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
app.post("/api/admin/register", async (req, res) => {
  const { email, password, name, phoneNumber, position } = req.body;

  try {
    // 이메일 중복 체크
    const [existingAdmin] = await queryDatabase(
      "SELECT * FROM admin_users WHERE email = ?",
      [email]
    );

    if (existingAdmin) {
      return res.status(400).json({ error: "이미 존재하는 이메일입니다." });
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 10);

    // 인증 코드 생성 및 저장
    const verificationCode = generateVerificationCode();
    await queryDatabase(
      "INSERT INTO admin_users (email, password, name, phone_number, position, verification_code) VALUES (?, ?, ?, ?, ?, ?)",
      [email, hashedPassword, name, phoneNumber, position, verificationCode]
    );

    // 인증 코드 이메일 발송
    await transporter.sendMail({
      from: EMAIL_CONFIG.auth.user,
      to: email,
      subject: "관리자 계정 인증 코드",
      text: `관리자 계정 인증 코드: ${verificationCode}`,
    });

    res.json({ message: "인증 코드가 이메일로 전송되었습니다." });
  } catch (error) {
    console.error("관리자 회원가입 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
// 임시 저장소 (실제 구현에서는 데이터베이스를 사용해야 합니다)
const pendingRegistrations = new Map();

// 인증 및 등록 처리
// 관리자 회원가입 인증 코드 요청
app.post("/api/admin/request-verification", async (req, res) => {
  const { email, password, name, phoneNumber, position } = req.body;

  try {
    // 이메일 중복 체크
    const [existingAdmin] = await queryDatabase(
      "SELECT * FROM admin_users WHERE email = ?",
      [email]
    );

    if (existingAdmin) {
      return res.status(400).json({ error: "이미 존재하는 이메일입니다." });
    }

    // 인증 코드 생성
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 10);

    // 임시 저장 (실제 구현에서는 데이터베이스를 사용해야 합니다)
    pendingAdminRegistrations.set(email, {
      email,
      hashedPassword,
      name,
      phoneNumber,
      position,
      verificationCode,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10분 후 만료
    });

    // 이메일로 인증 코드 전송
    await sendAdminVerificationEmail(email, verificationCode);

    res.json({ message: "인증 코드가 이메일로 전송되었습니다." });
  } catch (error) {
    console.error("관리자 인증 코드 요청 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 관리자 회원가입 인증 및 등록
// 상수로 총괄 관리자 이메일 정의
const SUPER_ADMIN_EMAIL = "rdrd1564@naver.com";

// 관리자 회원가입 인증 및 등록
app.post("/api/admin/verify-and-register", async (req, res) => {
  const { email, verificationCode } = req.body;

  try {
    const pendingRegistration = pendingAdminRegistrations.get(email);

    if (
      !pendingRegistration ||
      pendingRegistration.verificationCode !== verificationCode
    ) {
      return res.status(400).json({ error: "유효하지 않은 인증 코드입니다." });
    }

    if (Date.now() > pendingRegistration.expiresAt) {
      pendingAdminRegistrations.delete(email);
      return res.status(400).json({ error: "인증 코드가 만료되었습니다." });
    }

    // 관리자 코드 생성
    const adminCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    // 데이터베이스에 관리자 정보 저장
    await queryDatabase(
      "INSERT INTO admin_users (email, password, name, phone_number, position, admin_code) VALUES (?, ?, ?, ?, ?, ?)",
      [
        pendingRegistration.email,
        pendingRegistration.hashedPassword,
        pendingRegistration.name,
        pendingRegistration.phoneNumber,
        pendingRegistration.position,
        adminCode,
      ]
    );

    // 임시 저장소에서 정보 삭제
    pendingAdminRegistrations.delete(email);

    // 관리자 코드를 총괄 관리자 이메일로 전송
    await sendAdminCodeEmail(
      SUPER_ADMIN_EMAIL,
      adminCode,
      pendingRegistration.email
    );

    res.json({
      message:
        "관리자 등록이 완료되었습니다. 관리자 코드가 총괄 관리자에게 전송되었습니다.",
    });
  } catch (error) {
    console.error("관리자 등록 오류:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// 관리자 코드 이메일 전송 함수 수정
const sendAdminCodeEmail = async (
  superAdminEmail,
  adminCode,
  newAdminEmail
) => {
  const mailOptions = {
    from: EMAIL_CONFIG.auth.user,
    to: superAdminEmail,
    subject: "새 관리자 코드",
    text: `새로운 관리자(${newAdminEmail})의 관리자 코드입니다: ${adminCode}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(
      `Admin code for ${newAdminEmail} sent to super admin ${superAdminEmail}: ${adminCode}`
    );
  } catch (error) {
    console.error("관리자 코드 이메일 전송 오류:", error);
    throw new Error("관리자 코드 이메일 전송에 실패했습니다.");
  }
};

// 관리자 인증 코드 이메일 전송 함수
const sendAdminVerificationEmail = async (email, code) => {
  const mailOptions = {
    from: EMAIL_CONFIG.auth.user,
    to: email,
    subject: "관리자 회원가입 인증 코드",
    text: `관리자 회원가입을 위한 인증 코드입니다: ${code}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Admin verification code sent to ${email}: ${code}`);
  } catch (error) {
    console.error("관리자 인증 코드 이메일 전송 오류:", error);
    throw new Error("관리자 인증 코드 이메일 전송에 실패했습니다.");
  }
};

// 임시 저장소 (실제 구현에서는 데이터베이스를 사용해야 합니다)
const pendingAdminRegistrations = new Map();

// 관리자 인증 코드 확인
app.post("/api/admin/verify-and-register", async (req, res) => {
  const { email, verificationCode } = req.body;

  try {
    const pendingRegistration = pendingAdminRegistrations.get(email);

    if (
      !pendingRegistration ||
      pendingRegistration.verificationCode !== verificationCode
    ) {
      return res.status(400).json({ error: "유효하지 않은 인증 코드입니다." });
    }

    if (Date.now() > pendingRegistration.expiresAt) {
      pendingAdminRegistrations.delete(email);
      return res.status(400).json({ error: "인증 코드가 만료되었습니다." });
    }

    // 관리자 코드 생성
    const adminCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    // 데이터베이스에 관리자 정보 저장
    await queryDatabase(
      "INSERT INTO admin_users (email, password, name, phone_number, position, admin_code) VALUES (?, ?, ?, ?, ?, ?)",
      [
        pendingRegistration.email,
        pendingRegistration.hashedPassword,
        pendingRegistration.name,
        pendingRegistration.phoneNumber,
        pendingRegistration.position,
        adminCode,
      ]
    );

    // 임시 저장소에서 정보 삭제
    pendingAdminRegistrations.delete(email);

    // 관리자 코드를 이메일로 전송
    await sendAdminCodeEmail(email, adminCode);

    res.json({
      message:
        "관리자 등록이 완료되었습니다. 관리자 코드가 이메일로 전송되었습니다.",
    });
  } catch (error) {
    console.error("관리자 등록 오류:", error);
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
// 사용자 정보 업데이트 (닉네임)
app.get("/api/user", authenticateToken, async (req, res) => {
  try {
    const [user] = await queryDatabase(
      "SELECT id, email, nickname, profile_image FROM yeogi_main WHERE id = ?",
      [req.user.id]
    );
    if (!user) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }
    res.json(user);
  } catch (error) {
    console.error("사용자 정보 조회 실패:", error);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});
app.put(
  "/api/user/profile-image",
  authenticateToken,
  upload.single("profile_image"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "이미지 파일이 없습니다." });
    }

    const imageUrl = `/uploads/${req.file.filename}`; // 상대 경로로 변경

    try {
      // 기존 프로필 이미지가 있다면 삭제
      const [user] = await queryDatabase(
        "SELECT profile_image FROM yeogi_main WHERE id = ?",
        [req.user.id]
      );
      if (
        user.profile_image &&
        user.profile_image !== "/images/default-profile.png"
      ) {
        const oldImagePath = path.join(__dirname, "public", user.profile_image);
        fs.unlink(oldImagePath, (err) => {
          if (err) console.error("기존 이미지 삭제 실패:", err);
        });
      }

      // 데이터베이스 업데이트
      await queryDatabase(
        "UPDATE yeogi_main SET profile_image = ? WHERE id = ?",
        [imageUrl, req.user.id]
      );

      res.json({
        message: "프로필 이미지가 업데이트되었습니다.",
        profile_image: imageUrl,
      });
    } catch (error) {
      console.error("프로필 이미지 업데이트 실패:", error);
      res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
  }
);
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
// 사용자 정보 업데이트 (닉네임)
app.put("/api/user", authenticateToken, async (req, res) => {
  const { nickname } = req.body;

  if (!nickname) {
    return res.status(400).json({ error: "닉네임은 필수 입력 항목입니다." });
  }

  try {
    await queryDatabase("UPDATE yeogi_main SET nickname = ? WHERE id = ?", [
      nickname,
      req.user.id,
    ]);

    res.json({ message: "닉네임이 성공적으로 업데이트되었습니다.", nickname });
  } catch (error) {
    console.error("닉네임 업데이트 실패:", error);
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
