const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;

export default async function handler(req, res) {
  // 設定 CORS 標頭，允許你的網頁存取
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // 在正式版建議改成你的網域
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const response = await notion.databases.query({
        database_id: databaseId,
        sorts: [
          {
            property: 'CreatedAt',
            direction: 'descending',
          },
        ],
      });
      
      const tasks = response.results.map(page => {
        return {
          id: page.id,
          title: page.properties.Name.title[0]?.plain_text || '無標題',
          status: page.properties.Status.select?.name || 'todo',
          priority: page.properties.Priority.select?.name || 'normal',
          assignee: page.properties.Assignee.select?.name || '未指派',
          createdAt: page.properties.CreatedAt.date?.start || page.created_time
        };
      });

      res.status(200).json(tasks);
    } 
    
    else if (req.method === 'POST') {
      const { title, priority, assignee, status } = req.body;
      const response = await notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
          Name: {
            title: [{ text: { content: title } }],
          },
          Status: {
            select: { name: status || 'todo' }
          },
          Priority: {
            select: { name: priority || 'normal' }
          },
          Assignee: {
            select: { name: assignee || '學長' }
          },
          CreatedAt: {
            date: { start: new Date().toISOString() }
          }
        },
      });
      res.status(200).json(response);
    }

    else if (req.method === 'PATCH') {
        const { id, status } = req.body;
        const response = await notion.pages.update({
            page_id: id,
            properties: {
                Status: {
                    select: { name: status }
                }
            }
        });
        res.status(200).json(response);
    }

    else if (req.method === 'DELETE') {
        const { id } = req.body; // 實際上 Notion API 是 Archive
        const response = await notion.pages.update({
            page_id: id,
            archived: true
        });
        res.status(200).json(response);
    }

    else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
