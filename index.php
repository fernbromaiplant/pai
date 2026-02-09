<?php
// 1. 從 Render 的環境變數讀取金鑰
$channelAccessToken = getenv('LINE_CHANNEL_ACCESS_TOKEN');
$channelSecret = getenv('LINE_CHANNEL_SECRET');
$geminiApiKey = getenv('GOOGLE_GENAI_API_KEY');

// 2. 接收 Line 傳來的訊號
$rawBody = file_get_contents('php://input');
$data = json_decode($rawBody, true);

// 3. 處理 Line 的「Verify」按鈕測試（如果是空訊息就回傳 200）
if (!isset($data['events']) || empty($data['events'])) {
    http_response_code(200);
    echo "OK";
    exit();
}

// 4. 處理真正的訊息
foreach ($data['events'] as $event) {
    if ($event['type'] == 'message' && $event['message']['type'] == 'text') {
        $userMessage = $event['message']['text'];
        $replyToken = $event['replyToken'];

        // 呼叫 Gemini AI 取得回答
        $aiReply = getGeminiResponse($userMessage, $geminiApiKey);

        // 回傳給 Line
        replyLineMessage($replyToken, $aiReply, $channelAccessToken);
    }
}

function getGeminiResponse($text, $apiKey) {
    $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . $apiKey;
    $payload = ["contents" => [["parts" => [["text" => $text]]]]];
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    $result = json_decode($response, true);
    curl_close($ch);
    return $result['candidates'][0]['content']['parts'][0]['text'] ?? "AI 目前有點累，請稍後再試。";
}

function replyLineMessage($replyToken, $text, $accessToken) {
    $url = 'https://api.line.me/v2/bot/message/reply';
    $payload = ['replyToken' => $replyToken, 'messages' => [['type' => 'text', 'text' => $text]]];
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'Authorization: Bearer ' . $accessToken]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_exec($ch);
    curl_close($ch);
}
?>
