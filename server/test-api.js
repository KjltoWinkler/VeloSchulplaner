const http = require("http");

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on("error", reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log("=================================================");
  console.log("  Astra / Velo.Schulplaner Backend Test Suite");
  console.log("=================================================");

  let passCount = 0;
  let failCount = 0;

  function assert(title, condition, extra = "") {
    if (condition) {
      console.log(`[PASS] ${title} ${extra}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${title} ${extra}`);
      failCount++;
    }
  }

  // 1. Health check
  const health = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/health",
    method: "GET"
  });
  assert("1. Health check endpoint", health.status === 200 && health.data.status === "ok");

  // 2. Student login
  const studentLogin = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/auth/login",
    method: "POST",
    headers: { "Content-Type": "application/json" }
  }, { username: "schueler9a", password: "password123" });

  assert("2. Student Login", studentLogin.status === 200 && studentLogin.data.user.role === "schueler");
  assert("   Student assignedClass is 9aR", studentLogin.data.user?.assignedClass === "9aR");
  assert("   Student receives valid JWT token", !!studentLogin.data.token);

  const studentToken = studentLogin.data.token;

  // 3. Security: Admin endpoint without token must return 401
  const noTokenAdmin = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/admin/users",
    method: "GET"
  });
  assert("3. Reject unauthenticated admin access (401)", noTokenAdmin.status === 401);

  // 4. Security: Admin endpoint with Student token must return 403 Forbidden
  const studentAccessAdmin = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/admin/users",
    method: "GET",
    headers: { "Authorization": `Bearer ${studentToken}` }
  });
  assert("4. Reject student accessing admin route (403)", studentAccessAdmin.status === 403);

  // 5. Admin Login
  const adminLogin = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/auth/login",
    method: "POST",
    headers: { "Content-Type": "application/json" }
  }, { username: "admin", password: "adminpassword" });

  assert("5. Admin Login", adminLogin.status === 200 && adminLogin.data.user.role === "admin");
  assert("   Admin receives valid JWT token", !!adminLogin.data.token);

  const adminToken = adminLogin.data.token;

  // 6. Admin User List
  const adminUsersList = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/admin/users",
    method: "GET",
    headers: { "Authorization": `Bearer ${adminToken}` }
  });
  assert("6. Admin access /api/admin/users with token (200)", adminUsersList.status === 200 && Array.isArray(adminUsersList.data));

  // 7. Class Code validation: Create student with valid abbreviation '8bh' -> auto-normalized to '8bH'
  const createValidStudent = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/admin/users",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${adminToken}`
    }
  }, {
    username: "schueler8b_test",
    password: "securepassword456",
    role: "schueler",
    assignedClass: "8bh"
  });
  assert("7. Create student with class '8bh' (normalizes to 8bH)", 
    createValidStudent.status === 201 && createValidStudent.data.user.assignedClass === "8bH"
  );

  // 8. Class Code validation: Reject invalid class code '9Gymnasium'
  const createInvalidStudent = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/admin/users",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${adminToken}`
    }
  }, {
    username: "invalid_class_user",
    password: "pwd",
    role: "schueler",
    assignedClass: "9Gymnasium"
  });
  assert("8. Reject invalid class format '9Gymnasium' (400)", createInvalidStudent.status === 400);

  // 9. Class Code validation: Reject student without class
  const createStudentNoClass = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/admin/users",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${adminToken}`
    }
  }, {
    username: "no_class_student",
    password: "pwd",
    role: "schueler",
    assignedClass: ""
  });
  assert("9. Reject student without assigned class (400)", createStudentNoClass.status === 400);

  // 10. Strict Student Substitution filtering:
  // When 'schueler9a' requests substitutions, backend strictly enforces 9aR even if client sends ?class=8aR
  const studentSubs = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/substitutions?class=8aR",
    method: "GET",
    headers: { "Authorization": `Bearer ${studentToken}` }
  });
  const allEntriesAre9aR = studentSubs.data.entries.every(e => e.className === "9aR");
  assert("10. Student substitution query strictly locked to assignedClass (9aR)", 
    studentSubs.status === 200 && allEntriesAre9aR && studentSubs.data.entries.length > 0
  );

  // 11. Teacher Login
  const teacherLogin = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/auth/login",
    method: "POST",
    headers: { "Content-Type": "application/json" }
  }, { username: "lehrer_mueller", password: "password123" });

  assert("11. Teacher Login", teacherLogin.status === 200 && teacherLogin.data.user.role === "lehrer");

  // Clean up test user
  await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/admin/users/schueler8b_test",
    method: "DELETE",
    headers: { "Authorization": `Bearer ${adminToken}` }
  });

  console.log("=================================================");
  console.log(`Results: ${passCount} PASSED, ${failCount} FAILED`);
  console.log("=================================================");

  if (failCount > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests();
