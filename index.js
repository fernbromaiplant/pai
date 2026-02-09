<?php
// 1. 設定錯誤記錄（這會把錯誤顯示在 Render 的 Logs 裡）
error_reporting(E_ALL);
ini_set('display_errors', 1);

// 2. 取得環境變數
$channelAccessToken = getenv('LINE_CHANNEL_ACCESS_TOKEN');
$channelSecret = getenv('LINE_CHANNEL_SECRET');
$geminiApiKey = getenv('GOOGLE_GENAI_API_KEY');

// 3. 接收訊息
$rawBody = file_get_contents('php://input');
$data = json_decode($rawBody, true);

// --- 重要：處理 Line 的 Verify 請求 ---
if (empty($data['events'])) {
    // 當 Line 點擊 Verify 時，會傳送空的 events
    // 我們必須回傳 200 OK，否則會顯示 500 Error
    http_response_code(200);
    echo "OK";
    exit();
}

foreach ($data['events'] as $event) {
    // 確保訊息類型是文字
    if ($event['type'] == 'message' && $event['message']['type'] == 'text') {
        $userMessage = $event['message']['text'];
        $replyToken = $event['replyToken'];

        // 呼叫 Gemini AI
        $aiReply = getGeminiResponse($userMessage, $geminiApiKey);

        // 回傳給 Line
        replyLineMessage($replyToken, $aiReply, $channelAccessToken);
    }
}

// 函式：呼叫 Gemini API
function getGeminiResponse($text, $apiKey) {
    $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . $apiKey;
    
    $payload = [
        "contents" => [[
            "parts" => [["text" => $text]]
        ]]
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    
    // 略過 SSL 檢查（若 Render 環境報證書錯誤時使用）
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $result = json_decode($response, true);
    curl_close($ch);

    return $result['candidates'][0]['content']['parts'][0]['text'] ?? "AI 暫時無法回應，請檢查 API Key。";
}

// 函式：回傳 Line 訊息
function replyLineMessage($replyToken, $text, $accessToken) {
    $url = 'https://api.line.me/v2/bot/message/reply';
    
    $payload = [
        'replyToken' => $replyToken,
        'messages' => [['type' => 'text', 'text' => $text]]
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $accessToken
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    curl_exec($ch);
    curl_close($ch);
}

// 最後一定要回傳 200
http_response_code(200);
?>
