
import express from 'express';
const router = express.Router();
import { createClient } from '@clickhouse/client';


// Create a ClickHouse client
const clickhouseClient = createClient({
    url: process.env.CLICKHOUSE_URL
});



router.get('/:id', async (req, res) => {
    const deployment_id = req.params.id;
    try {
        const logs = await clickhouseClient.query({
            query: `SELECT log, timestamp FROM log_events WHERE deployment_id='${deployment_id}' ORDER BY timestamp ASC`,
            query_params: {
                deployment_id
            },
            format: 'JSONEachRow'
        });

        const rawLogs = await logs.json();
        res.status(200).json({
            logs: rawLogs.map((log: any) => ({
                log: log.log,
                timestamp: log.timestamp
            }))
        });;
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


export default router;