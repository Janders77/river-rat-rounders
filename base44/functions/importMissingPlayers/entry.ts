import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const csvUrl = body.csv_url;
    const minNum = body.min_num || 5255;
    const maxNum = body.max_num || 5386;

    if (!csvUrl) {
      return Response.json({ error: 'csv_url is required' }, { status: 400 });
    }

    // Fetch CSV
    const resp = await fetch(csvUrl);
    const text = await resp.text();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));

    const numIdx = header.indexOf('number');
    const firstIdx = header.findIndex(h => h === 'first_name' || h === 'first');
    const lastIdx = header.findIndex(h => h === 'last_name' || h === 'last');
    const emailIdx = header.indexOf('email');
    const guardsIdx = header.findIndex(h => h === 'card_guards' || h === 'guards');
    const dateIdx = header.indexOf('day');

    console.log('Header:', header);
    console.log('Indices:', { numIdx, firstIdx, lastIdx, emailIdx, guardsIdx, dateIdx });

    const toImport = [];

    for (let i = 1; i < lines.length; i++) {
      // Handle quoted CSV fields
      const cols = lines[i].match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) || lines[i].split(',');
      const clean = cols.map(c => (c || '').replace(/^"|"$/g, '').trim());

      const num = parseInt(clean[numIdx]);
      if (isNaN(num) || num < minNum || num > maxNum) continue;

      const firstName = firstIdx >= 0 ? clean[firstIdx] : '';
      const lastName = lastIdx >= 0 ? clean[lastIdx] : '';
      const email = emailIdx >= 0 ? clean[emailIdx] : '';
      const guards = guardsIdx >= 0 ? parseInt(clean[guardsIdx]) || 0 : 0;
      const dayRaw = dateIdx >= 0 ? clean[dateIdx] : '';

      let dateJoined = null;
      if (dayRaw) {
        const d = new Date(dayRaw);
        if (!isNaN(d.getTime())) {
          dateJoined = d.toISOString().split('T')[0];
        }
      }

      if (!firstName) continue;

      const record = {
        player_number: num,
        first_name: firstName,
        last_name: lastName,
        email: email || null,
        card_guards: guards,
      };
      if (dateJoined) record.date_joined = dateJoined;

      toImport.push(record);
    }

    console.log(`Found ${toImport.length} players in range ${minNum}-${maxNum}`);

    if (toImport.length === 0) {
      return Response.json({ success: true, imported: 0, message: 'No players found in that range' });
    }

    // Import in batches of 50
    let imported = 0;
    for (let i = 0; i < toImport.length; i += 50) {
      const batch = toImport.slice(i, i + 50);
      await base44.asServiceRole.entities.Player.bulkCreate(batch);
      imported += batch.length;
      await new Promise(r => setTimeout(r, 300));
    }

    return Response.json({ success: true, imported, range: `${minNum}-${maxNum}` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});