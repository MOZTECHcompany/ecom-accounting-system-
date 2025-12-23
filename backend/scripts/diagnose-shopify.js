
const https = require('https');
const fs = require('fs');
const path = require('path');

// Manually load .env
const envPath = path.resolve(__dirname, '../.env');
console.log(`Loading .env from: ${envPath}`);

if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["'](.*)["']$/, '$1');
      process.env[key] = value;
    }
  });
} else {
    console.error('❌ .env file not found!');
}

async function diagnose() {
  const shop = process.env.SHOPIFY_SHOP;
  const token = process.env.SHOPIFY_TOKEN;
  const version = process.env.SHOPIFY_API_VERSION || '2024-10';

  console.log('--- Shopify Configuration Diagnosis ---');
  console.log(`Shop: ${shop}`);
  console.log(`Token: ${token ? token.substring(0, 10) + '...' : 'MISSING'}`);
  console.log(`Version: ${version}`);

  if (!shop || !token) {
    console.error('❌ Missing SHOPIFY_SHOP or SHOPIFY_TOKEN in .env');
    return;
  }

  const domain = shop.replace(/^https?:\/\//, '').replace(/.myshopify.com$/, '');
  const hostname = `${domain}.myshopify.com`;
  
  console.log(`\nTarget Host: ${hostname}`);

  // 1. Test Connection (GET /shop.json)
  console.log('\n1. Testing Connection (GET /shop.json)...');
  try {
    const shopData = await request(hostname, `/admin/api/${version}/shop.json`, token);
    console.log('✅ Connection Successful!');
    console.log(`   Shop Name: ${shopData.shop.name}`);
    console.log(`   Email: ${shopData.shop.email}`);
    console.log(`   Currency: ${shopData.shop.currency}`);
  } catch (error) {
    console.error(`❌ Connection Failed: ${error.message}`);
    if (error.statusCode === 401) {
      console.error('   -> Invalid API Token. Please check SHOPIFY_TOKEN.');
    } else if (error.statusCode === 404) {
      console.error('   -> Shop not found or API version invalid.');
    }
    return;
  }

  // 2. Test Orders Permission (GET /orders.json?limit=1)
  console.log('\n2. Testing Orders Permission (GET /orders.json?limit=1)...');
  try {
    const ordersData = await request(hostname, `/admin/api/${version}/orders.json?limit=1&status=any`, token);
    console.log('✅ Fetch Orders Successful!');
    console.log(`   Orders Found: ${ordersData.orders.length}`);
    if (ordersData.orders.length > 0) {
      console.log(`   Latest Order ID: ${ordersData.orders[0].id}`);
      console.log(`   Created At: ${ordersData.orders[0].created_at}`);
    }
  } catch (error) {
    console.error(`❌ Fetch Orders Failed: ${error.message}`);
    if (error.statusCode === 403) {
      console.error('   -> Missing "read_orders" scope. Please update app permissions.');
    }
  }
}

function request(hostname, path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path,
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          const error = new Error(`Status Code: ${res.statusCode}`);
          error.statusCode = res.statusCode;
          error.body = data;
          reject(error);
        } else {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.end();
  });
}

diagnose();
