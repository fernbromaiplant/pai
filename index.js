<?php
// 從環境變數讀取金鑰
$channelAccessToken = getenv('LINE_CHANNEL_ACCESS_TOKEN');
$channelSecret = getenv('LINE_CHANNEL_SECRET');
$geminiApiKey = getenv('GOOGLE_GENAI_API_KEY');

// 接收 Line 傳來的訊息
$rawBody = file_get_contents('php://input');
$data = json_decode($rawBody, true);

// 簡單檢查請求是否有效
if (is_null($data) || !isset($data['events'])) {
    http_response_code(400);
    exit();
}

foreach ($data['events'] as $event) {
    if ($event['type'] == 'message' && $event['message']['type'] == 'text') {
        $userMessage = $event['message']['text'];
        $replyToken = $event['replyToken'];

        // 1. 呼叫 Gemini AI
        $aiReply = getGeminiResponse($userMessage, $geminiApiKey);

        // 2. 回傳給 Line
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
    
    $response = curl_exec($ch);
    $result = json_decode($response, true);
    curl_close($ch);

    return $result['candidates'][0]['content']['parts'][0]['text'] ?? "抱歉，AI 暫時無法回應。";
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
    
    curl_exec($ch);
    curl_close($ch);
}

// 回應 200 OK 給 Line 伺服器
http_response_code(200);
?>
