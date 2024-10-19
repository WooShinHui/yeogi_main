import React from "react";
import { Link } from "react-router-dom";

function ReservationFailPage() {
  return (
    <div>
      <h1>예약 실패</h1>
      <p>죄송합니다. 예약 과정에서 문제가 발생했습니다.</p>
      <Link to="/yeogi">홈으로 돌아가기</Link>
    </div>
  );
}

export default ReservationFailPage;
