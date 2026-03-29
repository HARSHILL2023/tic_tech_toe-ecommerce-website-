
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const AMZ_KEY  = process.env.RAPIDAPI_KEY;
const AMZ_HOST = 'real-time-amazon-data.p.rapidapi.com';
const FK_KEY   = process.env.FLIPKART_RAPIDAPI_KEY;
const FK_HOST  = 'real-time-flipkart-data2.p.rapidapi.com';

async function testAmz() {
  console.log('Testing Amazon...');
  const url = `https://${AMZ_HOST}/search?query=iphone&page=1&country=IN&sort_by=RELEVANCE`;
  try {
    const res = await fetch(url, { headers: { 'x-rapidapi-key': AMZ_KEY, 'x-rapidapi-host': AMZ_HOST } });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body snippet:', text.substring(0, 300));
  } catch (e) {
    console.error(e.message);
  }
}

async function testFk() {
  console.log('\nTesting Flipkart...');
  const url = `https://${FK_HOST}/search?q=iphone&page=1`;
  try {
    const res = await fetch(url, { headers: { 'x-rapidapi-key': FK_KEY, 'x-rapidapi-host': FK_HOST } });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body snippet:', text.substring(0, 300));
  } catch (e) {
    console.error(e.message);
  }
}

async function run() {
  await testAmz();
  await testFk();
}
run();
