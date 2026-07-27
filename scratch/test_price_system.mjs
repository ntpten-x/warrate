import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://obutszxtziedghqdfvln.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_u5xvX621W6e2q2ymE0AXmA_FOIMChmx";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTest() {
  console.log("=========================================");
  console.log("🧪 STARTING AUTOMATED TEST: PRICE SYSTEM");
  console.log("=========================================");

  // 1. Login with provided credentials
  const email = "tenx@wr.com";
  const password = "27451x";
  console.log(`Step 1: Logging in as ${email}...`);

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.session) {
    console.error("❌ Authentication failed:", authError?.message);
    process.exit(1);
  }

  const token = authData.session.access_token;
  console.log("✅ Authenticated successfully!");

  // 2. Fetch available items to get an item ID
  console.log("\nStep 2: Fetching item list...");
  const itemsRes = await fetch("http://localhost:3000/api/manage-items?limit=10", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!itemsRes.ok) {
    console.error("❌ Failed to fetch items list:", await itemsRes.text());
    process.exit(1);
  }

  const itemsData = await itemsRes.json();
  const items = itemsData.data || [];
  if (items.length === 0) {
    console.error("❌ No registered items found in system.");
    process.exit(1);
  }

  const testItem = items[0];
  console.log(`✅ Selected item for test: "${testItem.name}" (ID: ${testItem.id})`);

  // 3. Create a test price record with Estimated Range 10 - 13 THB, Popular Price 12 THB
  console.log("\nStep 3: Creating test price record (Estimated Range: 10-13 THB, Popular Selling Price: 12 THB)...");
  const postPayload = {
    itemId: testItem.id,
    lowPrice: 10,
    highPrice: 13,
    avgPrice: 12,
    source: "กลุ่ม Facebook Community WarzTH (TEST_AUTOMATED)",
    note: "รายการทดสอบระบบช่วงราคาประมาณ 10-13 บาท (ราคาขายยอดนิยม 12 บาท)",
    unitQuantity: 1,
    isBulk: false,
    showUnitPrice: true,
  };

  const createRes = await fetch("http://localhost:3000/api/prices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(postPayload),
  });

  if (!createRes.ok) {
    console.error("❌ Price creation failed:", await createRes.text());
    process.exit(1);
  }

  const createdRecord = await createRes.json();
  console.log("✅ Price record created successfully!");
  console.log(`   ID: ${createdRecord.id}`);
  console.log(`   Low Estimated Price: ${createdRecord.lowPrice} THB`);
  console.log(`   Popular Selling Price (avgPrice): ${createdRecord.avgPrice} THB`);
  console.log(`   High Estimated Price: ${createdRecord.highPrice} THB`);

  // 4. Verify data via GET API
  console.log("\nStep 4: Verifying price data via GET API...");
  const getRes = await fetch(`http://localhost:3000/api/prices?latest=true&itemId=${testItem.id}`);
  if (!getRes.ok) {
    console.error("❌ Verification GET failed:", await getRes.text());
    process.exit(1);
  }

  const latestRecord = await getRes.json();
  if (latestRecord.id !== createdRecord.id) {
    console.error("❌ Latest record ID mismatch!");
    process.exit(1);
  }

  if (latestRecord.lowPrice !== 10 || latestRecord.highPrice !== 13 || latestRecord.avgPrice !== 12) {
    console.error("❌ Price values mismatch in DB response!", latestRecord);
    process.exit(1);
  }
  console.log("✅ Price values verified: Low=10, Popular=12, High=13");

  // 5. Clean up test data (Delete record)
  console.log("\nStep 5: Cleaning up test data (Deleting test record ID: " + createdRecord.id + ")...");
  const deleteRes = await fetch(`http://localhost:3000/api/prices?id=${createdRecord.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!deleteRes.ok) {
    console.error("❌ Cleanup failed:", await deleteRes.text());
    process.exit(1);
  }

  const deleteData = await deleteRes.json();
  console.log("✅ Cleanup response:", deleteData.message);

  // Verify deletion
  const verifyDeleteRes = await fetch(`http://localhost:3000/api/prices?latest=true&itemId=${testItem.id}`);
  const postDeleteRecord = await verifyDeleteRes.json();
  if (postDeleteRecord && postDeleteRecord.id === createdRecord.id) {
    console.error("❌ Test record still exists after deletion!");
    process.exit(1);
  }

  console.log("✅ Verified test data successfully cleaned up from database!");
  console.log("=========================================");
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
  console.log("=========================================");
}

runTest().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
