<?php
// 超簡短測試版
http_response_code(200);
echo "Connection Successful";
error_log("Line Webhook Triggered!"); // 這會出現在 Render Logs 裡
