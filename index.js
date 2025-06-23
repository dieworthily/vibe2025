const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const PORT = 5500;

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'todolist',
};

async function retrieveListItems() {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT id, text FROM items');
    await connection.end();
    return rows;
}

async function getHtmlRows() {
    const todoItems = await retrieveListItems();
    return todoItems.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${item.text}</td>
            <td><button onclick="openEditModal(${item.id}, '${item.text.replace(/'/g, "\\'")}')">Edit</button></td>
        </tr>
    `).join('');
}

async function handleRequest(req, res) {
    if (req.method === 'GET' && req.url === '/') {
        try {
            const html = await fs.promises.readFile(path.join(__dirname, 'index.html'), 'utf8');
            const processedHtml = html.replace('{{rows}}', await getHtmlRows());
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(processedHtml);
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error loading page');
        }
    } else if (req.method === 'PUT' && req.url.startsWith('/edit/')) {
        const id = req.url.split('/')[2];
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            const { text } = JSON.parse(body);
            const connection = await mysql.createConnection(dbConfig);
            await connection.execute('UPDATE items SET text = ? WHERE id = ?', [text, id]);
            await connection.end();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'updated' }));
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
}

http.createServer(handleRequest).listen(PORT, () =>
    console.log(`Server running at http://localhost:${PORT}`)
);
