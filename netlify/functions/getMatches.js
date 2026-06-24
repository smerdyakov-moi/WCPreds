exports.handler = async function(event, context) {
    const API_KEY = process.env.FOOTBALL_API_KEY; 
    const targetUrl = "https://api.football-data.org/v4/competitions/WC/matches";

    try {
        const response = await fetch(targetUrl, {
            headers: { "X-Auth-Token": API_KEY }
        });

        if (!response.ok) {
            return { 
                statusCode: response.status, 
                body: JSON.stringify({ error: `API Rejected: ${response.status}` }) 
            };
        }

        const data = await response.json();
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Server failed to fetch data" })
        };
    }
};