import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://obutszxtziedghqdfvln.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_u5xvX621W6e2q2ymE0AXmA_FOIMChmx";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runComprehensiveTests() {
  console.log("=================================================================");
  console.log("🧪 STARTING COMPREHENSIVE TEST: PRICE MODES & LOGIC VALIDATION");
  console.log("=================================================================");

  // 1. Authenticate with credentials
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

  // 2. Get registered item
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
    console.error("❌ No items found in database.");
    process.exit(1);
  }

  const testItem = items[0];
  console.log(`✅ Selected item for test: "${testItem.name}" (ID: ${testItem.id})`);

  const createdTestIds = [];

  try {
    // -------------------------------------------------------------
    // TEST CASE A: Creating Exact Price (1:1 Mode, e.g. 5 THB)
    // -------------------------------------------------------------
    console.log("\n-------------------------------------------------------------");
    console.log("TEST CASE A: Creating Exact 1:1 Price (Price = 5 THB)...");
    const payloadExact = {
      itemId: testItem.id,
      lowPrice: 5,
      highPrice: 5,
      avgPrice: 5,
      source: "กลุ่ม Facebook Community WarzTH (TEST_EXACT_1_1)",
      note: "ทดสอบการสร้างราคาแบบเจาะจง 1:1 (5 บาท)",
      unitQuantity: 1,
      isBulk: false,
      showUnitPrice: true,
    };

    const resExact = await fetch("http://localhost:3000/api/prices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payloadExact),
    });

    if (!resExact.ok) {
      throw new Error(`Test Case A Failed: ${await resExact.text()}`);
    }

    const recordExact = await resExact.json();
    createdTestIds.push(recordExact.id);

    console.log("✅ Test Case A Passed!");
    console.log(`   Created ID: ${recordExact.id}`);
    console.log(`   Low Price: ${recordExact.lowPrice}, Avg Price: ${recordExact.avgPrice}, High Price: ${recordExact.highPrice}`);
    if (recordExact.lowPrice !== 5 || recordExact.highPrice !== 5 || recordExact.avgPrice !== 5) {
      throw new Error("Test Case A Error: Exact price values do not match 5 THB!");
    }

    // -------------------------------------------------------------
    // TEST CASE B: Creating Estimated Range (Low=10, Popular=12, High=13)
    // -------------------------------------------------------------
    console.log("\n-------------------------------------------------------------");
    console.log("TEST CASE B: Creating Estimated Price Range (10 - 13 THB, Popular = 12 THB)...");
    const payloadRange = {
      itemId: testItem.id,
      lowPrice: 10,
      highPrice: 13,
      avgPrice: 12,
      source: "กลุ่ม Facebook Community WarzTH (TEST_RANGE)",
      note: "ทดสอบการสร้างราคาแบบประมาณ 10-13 บาท (ราคาขายยอดนิยม 12 บาท)",
      unitQuantity: 1,
      isBulk: false,
      showUnitPrice: true,
    };

    const resRange = await fetch("http://localhost:3000/api/prices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payloadRange),
    });

    if (!resRange.ok) {
      throw new Error(`Test Case B Failed: ${await resRange.text()}`);
    }

    const recordRange = await resRange.json();
    createdTestIds.push(recordRange.id);

    console.log("✅ Test Case B Passed!");
    console.log(`   Created ID: ${recordRange.id}`);
    console.log(`   Low Price: ${recordRange.lowPrice}, Popular Price: ${recordRange.avgPrice}, High Price: ${recordRange.highPrice}`);
    if (recordRange.lowPrice !== 10 || recordRange.highPrice !== 13 || recordRange.avgPrice !== 12) {
      throw new Error("Test Case B Error: Range price values mismatch!");
    }

    // -------------------------------------------------------------
    // TEST CASE C: Testing Invalid Logic Rejection (Preventing Inconsistent Data)
    // -------------------------------------------------------------
    console.log("\n-------------------------------------------------------------");
    console.log("TEST CASE C: Attempting Invalid Price (low=15 > avg=12 > high=13)...");
    const payloadInvalid = {
      itemId: testItem.id,
      lowPrice: 15,
      highPrice: 13,
      avgPrice: 12,
      source: "INVALID_TEST",
      note: "ทดสอบข้อมูลขัดแย้งที่ไม่ควรยอมให้บันทึกได้",
    };

    const resInvalid = await fetch("http://localhost:3000/api/prices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payloadInvalid),
    });

    if (resInvalid.ok) {
      const badData = await resInvalid.json();
      createdTestIds.push(badData.id);
      throw new Error("❌ FAIL: System allowed invalid logic low > avg or avg > high!");
    } else {
      console.log("✅ Test Case C Passed! Invalid payload was correctly rejected by business logic validation.");
      console.log("   Server Response Status:", resInvalid.status);
    }

  } finally {
    // -------------------------------------------------------------
    // CLEANUP TEST DATA
    // -------------------------------------------------------------
    console.log("\n-------------------------------------------------------------");
    console.log("CLEANUP: Deleting all created test records...");

    for (const id of createdTestIds) {
      const delRes = await fetch(`http://localhost:3000/api/prices?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (delRes.ok) {
        console.log(`✅ Deleted test record ID: ${id}`);
      } else {
        console.warn(`⚠️ Failed to delete test record ID: ${id}`);
      }
    }
  }

  console.log("\n=================================================================");
  console.log("🎉 COMPREHENSIVE TESTS COMPLETED & ALL TEST DATA CLEANED UP!");
  console.log("=================================================================");
}

runComprehensiveTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
