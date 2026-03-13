#!/usr/bin/env python3
"""
BC Real Estate — Editable HTML Form Templates
All 12 standard BC real estate forms as fillable, editable HTML.
Pre-populated with listing data; every field remains editable.
Print to PDF from browser (Ctrl+P) for perfect output.
"""

import os, html as hl
from datetime import date, timedelta

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Helpers ──────────────────────────────────────────────────────────────────

def e(v):
    """HTML-escape a value."""
    if v is None: return ''
    return hl.escape(str(v), quote=True)

def d(data, *keys, default=''):
    v = data
    for k in keys:
        if isinstance(v, dict): v = v.get(k, default)
        else: return default
    return v if v is not None else default

def today(): return date.today().strftime('%B %d, %Y')
def today_iso(): return date.today().isoformat()

def expiry_date(start_str, days):
    try:
        return (date.fromisoformat(start_str) + timedelta(days=int(days))).strftime('%B %d, %Y')
    except: return ''

def fmt_price(v):
    try: return f'${float(v):,.0f}'
    except: return str(v) if v else ''

def sellers_list(L):
    return L.get('seller') or [{}]

# ── Base template loader ──────────────────────────────────────────────────────

def _base(title, body):
    base_path = os.path.join(BASE_DIR, 'forms', '_base.html')
    with open(base_path) as f:
        tmpl = f.read()
    return tmpl.replace('{{FORM_TITLE}}', title).replace('{{BODY}}', body)

# ── Shared field building ─────────────────────────────────────────────────────

def field(label, value='', placeholder='', wide=False, name=''):
    ta = 'style="width:100%"' if wide else ''
    nm = f'name="{e(name)}"' if name else ''
    return f'''<div class="field">
  <label>{e(label)}</label>
  <input type="text" {nm} value="{e(value)}" placeholder="{e(placeholder)}">
</div>'''

def field_ta(label, value='', rows=3, name=''):
    nm = f'name="{e(name)}"' if name else ''
    return f'''<div class="field">
  <label>{e(label)}</label>
  <textarea {nm} rows="{rows}">{e(value)}</textarea>
</div>'''

def cols(*items):
    inner = ''.join(f'<div class="col-half">{it}</div>' for it in items)
    return f'<div class="cols">{inner}</div>'

def cols3(*items):
    inner = ''.join(f'<div class="col-third">{it}</div>' for it in items)
    return f'<div class="cols">{inner}</div>'

def sec(title, color='#141e3c'):
    return f'<div class="sec" style="background:{color}">{e(title)}</div>'

def chk(label, checked=False, name='', value='1', indent=False):
    c = 'checked' if checked else ''
    nm = f'name="{e(name)}"' if name else ''
    pad = 'style="margin-left:18px"' if indent else ''
    return f'''<div class="chk-row" {pad}>
  <input type="checkbox" {nm} value="{e(value)}" {c}>
  <label>{label}</label>
</div>'''

def radio_pair(name, label1, label2, checked=1):
    c1 = 'checked' if checked == 1 else ''
    c2 = 'checked' if checked == 2 else ''
    return f'''<div class="radio-row">
  <input type="radio" name="{e(name)}" value="1" {c1}>
  <label>{label1}</label>
</div>
<div class="radio-row">
  <input type="radio" name="{e(name)}" value="2" {c2}>
  <label>{label2}</label>
</div>'''

def ynu_row(qid, question, answer='', detail=''):
    rans = answer.lower() if answer else ''
    cy = 'checked' if rans == 'yes' else ''
    cn = 'checked' if rans == 'no'  else ''
    cu = 'checked' if rans == 'unknown' else ''
    if not rans: cu = 'checked'
    det_html = f'<tr><td colspan="3" style="padding:0 4px 6px 28px"><div class="ynu-detail"><input type="text" placeholder="Details…" value="{e(detail)}"></div></td></tr>' if detail or rans == 'yes' else ''
    return f'''<tr>
  <td class="qnum">{qid}</td>
  <td class="qtext">{question}</td>
  <td class="ynu-opts">
    <div class="ynu-opt-group">
      <div class="ynu-opt"><input type="radio" name="ynu_{qid}" value="yes" {cy}><label>Yes</label></div>
      <div class="ynu-opt"><input type="radio" name="ynu_{qid}" value="no"  {cn}><label>No</label></div>
      <div class="ynu-opt"><input type="radio" name="ynu_{qid}" value="unk" {cu}><label>Unknown</label></div>
    </div>
  </td>
</tr>{det_html}'''

def sig_block(label, name='', pre_name='', date_val=''):
    return f'''<div class="sig-col">
  <div class="sig-line">
    <div class="sig-label">{e(label)}</div>
    <input class="sig-input" type="text" placeholder="Sign here…" value="{e(pre_name)}">
  </div>
</div>
<div class="sig-col" style="max-width:200px">
  <div class="sig-line">
    <div class="sig-label">Date</div>
    <input class="date-field" type="text" value="{e(date_val or today())}">
  </div>
</div>'''

def notice(text, style=''):
    cls = f'notice {style}' if style else 'notice'
    return f'<div class="{cls}">{text}</div>'

def pg_footer(label, page, total, org='BCREA'):
    return f'''<div class="pg-footer">
  <span class="pf-left">PAGE {page} OF {total}</span>
  <span class="pf-center">{e(label)}</span>
  <span class="pf-right">{e(org)}</span>
</div>'''

def hdr_bar(org, full_name, form_name, form_num, color):
    return f'''<div class="form-hdr" style="background:{color}">
  <div class="fh-left">
    <span class="fh-org">{e(org)}</span>
    <span class="fh-full">{e(full_name)}</span>
  </div>
  <div class="fh-right">
    <div class="fh-name">{e(form_name)}</div>
    <div class="fh-num">{e(form_num)}</div>
  </div>
</div>'''

def cont_bar(title, color='#141e3c'):
    return f'<div class="cont-hdr" style="background:{color}">{e(title)}</div>'


# ══════════════════════════════════════════════════════════════════════════════
#  1. DORTS — Disclosure of Representation in Trading Services
# ══════════════════════════════════════════════════════════════════════════════

def html_dorts(data):
    cfg = data.get('cfg', {}); L = data.get('listing', {})
    Ss  = sellers_list(L)

    # ── Page 1: Consumer Information ──────────────────────────────────────────
    p1 = f'''<div class="page">
  <!-- BCFSA Logo -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
    <div>
      <div style="display:flex;align-items:baseline;gap:0">
        <span style="font-size:26pt;font-weight:900;color:#141e3c;letter-spacing:-.03em">BCFS</span>
        <span style="font-size:26pt;font-weight:900;color:#009DAE;letter-spacing:-.03em">A</span>
        <span style="display:inline-block;width:1px;background:#ccc;height:28px;margin:0 10px;vertical-align:middle"></span>
        <div style="display:flex;flex-direction:column;justify-content:center">
          <span style="font-size:11pt;font-weight:700;color:#141e3c">BC Financial</span>
          <span style="font-size:11pt;color:#141e3c">Services Authority</span>
        </div>
      </div>
      <div style="font-size:28pt;font-weight:900;color:#009DAE;line-height:1.1;margin-top:10px">Your Relationship<br>with a Real Estate<br>Professional</div>
      <div style="font-size:11pt;font-weight:700;color:#141e3c;margin-top:10px;max-width:400px">
        Real estate professionals have a regulatory requirement to present you with this consumer information before providing services to you.
      </div>
    </div>
    <div style="border:1px solid #ccc;border-radius:4px;padding:12px 14px;max-width:240px;font-size:8pt;line-height:1.5">
      <strong>BC Financial Services Authority</strong><br>
      is the legislated regulatory agency that works to ensure real estate professionals have the skills and knowledge to provide you with a high standard of service. All real estate professionals must follow rules that help protect consumers, like you. We're here to help you understand your rights as a real estate consumer.<br><br>
      <strong>Keep this information page for your reference.</strong>
    </div>
  </div>

  <p style="font-size:9pt;color:#333;margin-bottom:14px">This information explains the different relationships you can have with a real estate professional to buy, sell or lease property. Before you disclose confidential information to a real estate professional regarding a real estate transaction, you should understand what type of business relationship you have with that individual.</p>

  <div style="background:#f3f3f3;padding:14px 16px;border-radius:4px">
    <p style="font-size:9.5pt;font-weight:700;color:#141e3c;margin-bottom:12px">You can work with a real estate professional in one of the following ways:</p>
    <div style="display:flex;gap:20px">
      <div style="flex:1">
        <div style="font-size:8.5pt;font-weight:700;color:#009DAE;text-transform:uppercase;margin-bottom:8px">AS A CLIENT</div>
        <p style="font-size:8.5pt;margin-bottom:8px">If you are the client of a real estate professional, they work on your behalf. The real estate professional representing you has special legal duties to you, including:</p>
        <ul style="font-size:8.5pt;padding-left:16px;line-height:1.7">
          <li><strong>Loyalty.</strong> They will act only in your best interests.</li>
          <li><strong>Full disclosure.</strong> They must tell you everything they know that might influence your decision in a transaction.</li>
          <li><strong>Avoid conflicts of interest.</strong> They must avoid any situation that would affect their duty to act in your best interests.</li>
          <li><strong>Confidentiality.</strong> They must not reveal your private information without your permission, even after your relationship ends. That includes:
            <ul style="padding-left:14px">
              <li>your reasons for buying, selling or leasing</li>
              <li>your minimum/maximum price</li>
              <li>any preferred terms and conditions you may want to include in a contract</li>
            </ul>
          </li>
        </ul>
        <p style="font-size:8.5pt;margin-top:8px">When you become a client, you may be asked to sign a written agreement setting out your and the real estate professional's responsibilities.</p>
      </div>
      <div style="flex:1">
        <div style="font-size:8.5pt;font-weight:700;color:#009DAE;text-transform:uppercase;margin-bottom:8px">AS A NON-CLIENT</div>
        <p style="font-size:8.5pt;margin-bottom:8px">A real estate professional who is not representing you as a client does not owe you special legal duties:</p>
        <ul style="font-size:8.5pt;padding-left:16px;line-height:1.7">
          <li><strong>No loyalty.</strong> They may be representing a client with competing interests to yours in a transaction.</li>
          <li><strong>No duty of full disclosure.</strong> They do not have a duty to give you all relevant information.</li>
          <li><strong>No duty to avoid conflicts.</strong> They are not acting in your interests.</li>
          <li><strong>No confidentiality.</strong> They must share any information you tell them with their clients in a transaction.</li>
        </ul>
        <p style="font-size:8.5pt;margin-top:8px">As a non-client, a real estate professional may give you only limited services.</p>
        <div style="background:#ddd;padding:10px;border-radius:3px;margin-top:12px;font-size:8pt;line-height:1.5">
          Whenever a real estate professional works with you in a real estate transaction, whether you are their client or not, they have a responsibility to act honestly and with reasonable care and skill.
        </div>
      </div>
    </div>
  </div>

  <div style="margin-top:14px;font-size:9pt;font-weight:700;color:#141e3c">
    Did you know buyers have a right to cancel a contract to purchase some types of residential real property in B.C.?
    To learn more about the Home Buyer Rescission Period, visit www.bcfsa.ca or talk to your real estate licensee, a lawyer, or a notary.
  </div>

  {pg_footer('Your Relationship with a Real Estate Professional', 1, 2, 'BCFSA')}
</div>'''

    # ── Page 2: Disclosure Form ────────────────────────────────────────────────
    p2 = f'''<div class="page">
  <div style="font-size:16pt;font-weight:800;color:#141e3c;border-bottom:2px solid #141e3c;padding-bottom:6px;margin-bottom:14px">
    Your Relationship with a Real Estate Professional
  </div>

  <div style="font-size:9.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#141e3c;margin-bottom:8px">
    DISCLOSURE OF REPRESENTATION IN TRADING SERVICES
  </div>
  <div style="border-bottom:1px solid #ccc;margin-bottom:12px"></div>

  <p style="font-size:9pt;margin-bottom:10px">
    <span style="color:#009DAE;font-weight:700">This is a required disclosure form in compliance with sections 54 of the Real Estate Services Rules.</span>
    Your real estate professional must present the <em>Your Relationship with a Real Estate Professional</em> information page to you along with this disclosure form.
  </p>

  <div class="compliance-box">
    <div class="cb-hdr">REAL ESTATE PROFESSIONAL DISCLOSURE DETAILS</div>

    <p style="font-size:9.5pt;margin-bottom:10px">I disclose that I am <em>(check one)</em>:</p>

    {radio_pair('representation',
      'representing you as my client',
      '<strong>not</strong> representing you as a client',
      checked=1)}

    <div style="height:14px"></div>

    {field('Name', e(d(cfg,'agentName')))}
    {field('Team name and members, if applicable. <em style="font-size:7.5pt;color:#888">The duties of a real estate professional as outlined in this form apply to all team members.</em>', '')}
    {field('Brokerage', e(d(cfg,'brokerage')))}
    {cols(
      '<div class="field"><label>Signature</label><input class="sig-input" type="text" placeholder="Sign here…"></div>',
      field('Date', today())
    )}
    <div class="field"><label>Notes:</label><textarea rows="3"></textarea></div>
  </div>

  <div style="height:16px"></div>

  <div style="border:1.5px solid #009DAE;border-radius:4px;padding:16px;background:#f0fafb;position:relative">
    <div style="position:absolute;top:14px;right:14px;background:#009DAE;color:white;padding:5px 14px;border-radius:3px;font-size:8.5pt;font-weight:700">This is NOT a contract</div>
    <div style="font-size:11pt;font-weight:800;color:#009DAE;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">CONSUMER ACKNOWLEDGMENT:</div>
    <p style="font-size:9.5pt;margin-bottom:18px">I acknowledge that I have received the <strong>Your Relationship with a Real Estate Professional</strong> consumer information page and this disclosure form.</p>
    <div style="display:flex;gap:20px">
      <div style="flex:1">
        <div style="border-bottom:1.2px solid #888;margin-bottom:4px"></div>
        <div style="font-size:7pt;color:#666">Name (optional)</div>
        <div style="height:16px"></div>
        <div style="display:flex;gap:12px">
          <div style="flex:1;border-bottom:1.2px solid #888;padding-bottom:2px"><div style="font-size:7pt;color:#666;margin-top:3px">Initials (optional)</div></div>
          <div style="flex:1;border-bottom:1.2px solid #888;padding-bottom:2px"><div style="font-size:7pt;color:#666;margin-top:3px">Date</div></div>
        </div>
      </div>
      <div style="flex:1">
        <div style="border-bottom:1.2px solid #888;margin-bottom:4px"></div>
        <div style="font-size:7pt;color:#666">Name (optional)</div>
        <div style="height:16px"></div>
        <div style="display:flex;gap:12px">
          <div style="flex:1;border-bottom:1.2px solid #888;padding-bottom:2px"><div style="font-size:7pt;color:#666;margin-top:3px">Initials (optional)</div></div>
          <div style="flex:1;border-bottom:1.2px solid #888;padding-bottom:2px"><div style="font-size:7pt;color:#666;margin-top:3px">Date</div></div>
        </div>
      </div>
    </div>
  </div>

  <p style="font-size:7.5pt;color:#666;margin-top:14px">A copy of this disclosure is not required to be provided to BC Financial Services Authority unless it is specifically requested.</p>

  <div style="display:flex;justify-content:center;align-items:center;gap:12px;margin-top:30px">
    <span style="font-size:14pt;font-weight:900;color:#141e3c">BCFS</span><span style="font-size:14pt;font-weight:900;color:#009DAE">A</span>
    <span style="color:#ccc;font-size:18pt">|</span>
    <div style="font-size:7.5pt;line-height:1.4;color:#444"><strong>BC Financial</strong><br>Services Authority</div>
    <span style="color:#ccc;font-size:16pt"> / </span>
    <div style="font-size:9pt;font-weight:700;color:#009DAE">You're Protected<br>bcfsa.ca</div>
  </div>

  {pg_footer('Disclosure of Representation in Trading Services', 2, 2, 'BCFSA')}
</div>'''

    return _base('DORTS — Disclosure of Representation in Trading Services', p1 + p2)


# ══════════════════════════════════════════════════════════════════════════════
#  2. MLC — Multiple Listing Contract  (BCREA Form 100)
# ══════════════════════════════════════════════════════════════════════════════

def html_mlc(data):
    cfg = data.get('cfg', {}); L = data.get('listing', {})
    Ss  = sellers_list(L)
    S   = Ss[0]
    prop = d(L,'propAddress')
    if d(L,'propUnit'): prop = f'{d(L,"propUnit")} - {prop}'
    start = d(L,'createdAt') or today_iso()
    expiry = expiry_date(start, d(L,'listDuration','90'))
    try: start_fmt = date.fromisoformat(start).strftime('%B %d, %Y')
    except: start_fmt = start

    # Page 1: Pre-compute sellers_html to avoid nested f-strings
    sellers_html = ""
    for i, s in enumerate(Ss[:2]):
        sellers_html += f'''
  {field(f"Seller {i+1} — Full Legal Name", e(s.get("fullName","")))}
  {cols(field("Address", e(s.get("address",""))),
        field("Phone", e(s.get("phone",""))),
        field("Email", e(s.get("email",""))))}
  '''

    p1 = f'''<div class="page">
  {hdr_bar('BCREA','British Columbia Real Estate Association','MULTIPLE LISTING CONTRACT','Form 100  ·  Standard Form','#BE0000')}

  {notice('<strong>IMPORTANT:</strong> This is a legally binding document. If you have any questions, consult your REALTOR® or a lawyer before signing.','legal')}

  <div style="display:flex;justify-content:space-between;margin-bottom:12px">
    {field('Listing ID', e(d(L,'id')))}
    {field('Date Prepared', today())}
  </div>

  {sec('1.  PROPERTY INFORMATION')}
  {field('Civic Address (Street Number, Street Name, City, Province, Postal Code)', prop)}
  {cols(field('PID (Parcel Identifier)', e(d(L,'parcel','pid'))),
        field('Legal Description', e(d(L,'parcel','parcelName'))))}
  {cols(field('Municipality / City', e(d(L,'geo','city','Surrey'))),
        field('Property Type', e(d(L,'propType','Detached').title())),
        field('Year Built', e(d(L,'assessment','yearBuilt'))))}

  {sec('2.  SELLER(S)')}
  {sellers_html}

  {sec('3.  LISTING TERMS')}
  {cols(field('List Price', fmt_price(d(L,'listPrice'))),
        field('Annual Property Tax', e(d(L,'assessment','taxAmount'))))}
  {cols(field('Listing Start Date', start_fmt),
        field('Listing Expiry Date', expiry),
        field('Possession / Completion Date', e(d(L,'possessionDate'))))}
  {field('Showing Instructions', e(d(L,'showingInstructions')))}

  <div style="margin:14px 0 8px">
    <strong style="font-size:9pt;color:#141e3c">Multiple Listing Service® Authorization</strong>
    {chk('The Seller authorizes the Brokerage to submit the listing information to the Multiple Listing Service® (MLS®) operated by the local real estate board and authorizes the board and its members to use and distribute the information.', True)}
  </div>

  {pg_footer('Multiple Listing Contract — Form 100', 1, 3)}
</div>'''

    # Page 2
    p2 = f'''<div class="page">
  {cont_bar('MULTIPLE LISTING CONTRACT (continued)  ·  Form 100')}

  {sec('4.  COMMISSION / REMUNERATION')}
  {cols(field('Gross Commission (% of Sale Price)', e(d(L,'commissionSeller','3.222')) + '%'),
        field('Co-operating Brokerage Commission', e(d(L,'commissionBuyer','2.5')) + '%'))}
  {notice(f'The Seller agrees to pay the Listing Brokerage a commission of <strong>{e(d(L,"commissionSeller","3.222"))}%</strong> of the gross sale price. Of this, <strong>{e(d(L,"commissionBuyer","2.5"))}%</strong> shall be offered to any co-operating brokerage representing a buyer. Commission is payable on completion of the sale or as otherwise agreed in writing.')}

  {sec('5.  INCLUSIONS / EXCLUSIONS')}
  {field('Included Items (fixtures, appliances, etc.)', ', '.join(d(L,'inclusions') or []) or 'As per standard schedule')}
  {field('Excluded Items', ', '.join(d(L,'exclusions') or []) or 'None')}
  {field('Rental Equipment (describe)', ', '.join(d(L,'rentalEquipment') or []) or 'None')}

  {sec('6.  SELLER REPRESENTATIONS & WARRANTIES')}
  {chk('The Seller has the right to sell the property and there are no agreements, options, or rights of first refusal affecting title.', True)}
  {chk('The Seller is not aware of any unregistered easements, rights of way, or other encumbrances on the property, except as disclosed.', True)}
  {chk('The Seller will complete all material disclosures in the Property Disclosure Statement prior to accepting an offer.', True)}
  {chk('The Seller confirms that all information provided in this contract is accurate to the best of their knowledge.', True)}

  {sec('7.  LISTING BROKERAGE INFORMATION')}
  {field('Brokerage Name', e(d(cfg,'brokerage')))}
  {field('Brokerage Address', e(d(cfg,'brokerageAddress')))}
  {cols(field('Listing Agent Name', e(d(cfg,'agentName'))),
        field('License Number', e(d(cfg,'agentLicense'))))}
  {cols(field('Agent Phone', e(d(cfg,'agentPhone'))),
        field('Agent Email', e(d(cfg,'agentEmail'))))}

  {pg_footer('Multiple Listing Contract — Form 100', 2, 3)}
</div>'''

    # Page 3: Pre-compute sellers_sigs_html to avoid nested f-strings
    sellers_sigs_html = ""
    for i, s in enumerate(Ss[:2]):
        sellers_sigs_html += f'''
  <p style="font-size:8pt;font-weight:700;color:#666;margin-bottom:6px">{"First" if i==0 else "Second"} Seller</p>
  <div class="sig-section"><div class="sig-row">{sig_block(f"Seller Signature", pre_name="")}<div class="sig-col"><div class="sig-line"><div class="sig-label">Print Full Name</div><input type="text" class="date-field" value="{e(s.get("fullName",""))}"></div></div></div></div>
  '''

    p3 = f'''<div class="page">
  {cont_bar('MULTIPLE LISTING CONTRACT — SIGNATURES  ·  Form 100')}

  {sec('8.  IMPORTANT NOTICES', '#BE0000')}
  {chk('<strong>Right to Representation:</strong> Before signing, ensure you have received and reviewed the Disclosure of Representation in Trading Services (DORTS) form.', True)}
  {chk('<strong>FINTRAC:</strong> By law, your agent is required to verify your identity. Ensure your government-issued photo ID is available.', True)}
  {chk('<strong>Property Disclosure:</strong> A Property Disclosure Statement is required before accepting any offer on your property.', True)}
  {chk('<strong>Cooling-off Period:</strong> There is no cooling-off period on a listing agreement. Please ensure you understand all terms before signing.', True)}

  {sec('9.  SELLER SIGNATURE(S)')}
  {sellers_sigs_html}

  {sec('10.  BROKERAGE ACCEPTANCE')}
  <p style="font-size:9pt;margin-bottom:10px">Brokerage: <strong>{e(d(cfg,'brokerage'))}</strong></p>
  <div class="sig-section"><div class="sig-row">{sig_block("Authorized Agent Signature", pre_name=e(d(cfg,'agentName')))}</div></div>

  {notice('This form was approved by the British Columbia Real Estate Association (BCREA) for use by its members. BCREA bears no liability for use of this form other than for its intended purpose as a listing contract.')}

  {pg_footer('Multiple Listing Contract — Form 100', 3, 3)}
</div>'''

    return _base('MLC — Multiple Listing Contract (Form 100)', p1 + p2 + p3)


# ══════════════════════════════════════════════════════════════════════════════
#  3. PDS — Property Disclosure Statement Residential  (BCREA Form 5A)
# ══════════════════════════════════════════════════════════════════════════════

def html_pds(data):
    cfg = data.get('cfg', {}); L = data.get('listing', {})
    Ss  = sellers_list(L); S = Ss[0]
    prop = d(L,'propAddress')
    if d(L,'propUnit'): prop = f'{d(L,"propUnit")} - {prop}'
    is_strata = d(L,'propType') in ('condo','townhouse','strata')
    grow = 'yes' if d(L,'growOpHistory') else 'no'
    legal = 'yes' if d(L,'pendingLegal') else 'no'
    env = 'yes' if d(L,'environmentalIssues') else 'no'
    unp = 'yes' if d(L,'unpermittedRenos') else 'no'

    ynu_tbl = lambda rows: f'<table class="ynu-table">{"".join(rows)}</table>'

    p1 = f'''<div class="page">
  {hdr_bar('BCREA','British Columbia Real Estate Association','PROPERTY DISCLOSURE STATEMENT','Residential  ·  Form 5A','#BE0000')}
  {notice('<strong>NOTE:</strong> This statement is not a warranty. Sellers must disclose known material latent defects. Buyers should conduct their own independent inspections.','legal')}
  <div style="display:flex;justify-content:flex-end;margin-bottom:8px"><span style="font-size:8pt;color:#666">Date: {today()}</span></div>
  {field('Property Address', prop)}
  {field("Seller(s) Full Legal Name(s)", ", ".join(s.get("fullName","") for s in Ss[:2] if s.get("fullName")))}
  {cols(field('PID', e(d(L,'parcel','pid'))),
        field('Legal Description', e(d(L,'parcel','parcelName'))))}

  {notice('INSTRUCTIONS: For each question, check Yes, No, or Unknown. Provide details in the space provided for any "Yes" answer.')}

  {sec('A.  TITLE / LEGAL ISSUES')}
  {ynu_tbl([
    ynu_row('A1','Are there any easements, rights of way, or other encumbrances registered against the property title, other than those shown on the certificate of title?'),
    ynu_row('A2','Are you aware of any unregistered encumbrances, claims, or disputes affecting the property?'),
    ynu_row('A3','Is the property subject to any rental agreement, tenancy agreement, or lease that will survive closing?'),
    ynu_row('A4','Are you aware of any work orders, by-law violations, or municipal notices outstanding against the property?'),
    ynu_row('A5','Are there any pending or threatened legal proceedings affecting the property?', legal),
  ])}

  {sec('B.  WATER / SEWAGE')}
  {ynu_tbl([
    ynu_row('B1','Is the property connected to a municipal water system?', 'yes'),
    ynu_row('B2','Is the property connected to a municipal sewage system?', 'yes'),
    ynu_row('B3','Are you aware of any problems with the water supply, water pressure, or water quality?', 'no'),
    ynu_row('B4','Has the property ever been connected to a well or septic system?', 'no'),
    ynu_row('B5','Are you aware of any moisture or water infiltration in the basement, crawl space, or any other area of the property?'),
  ])}

  {pg_footer('Property Disclosure Statement — Form 5A', 1, 3)}
</div>'''

    p2 = f'''<div class="page">
  {cont_bar('PROPERTY DISCLOSURE STATEMENT — RESIDENTIAL  (continued)')}

  {sec('C.  STRUCTURE / ROOF')}
  {ynu_tbl([
    ynu_row('C1','Are you aware of any structural problems, settling, or movement affecting the foundations, walls, or roof?'),
    ynu_row('C2','Has any part of the property been damaged by fire, flood, or other causes?'),
    ynu_row('C3','Are you aware of any asbestos-containing materials in the property?'),
    ynu_row('C4','Are you aware of any problems with the roof (leaking, improper installation, etc.)?'),
    ynu_row('C5','Have there been any renovations, additions, or alterations to the property without a required permit?', unp,
            ', '.join(d(L,'unpermittedRenos') or [])),
  ])}

  {sec('D.  ELECTRICAL / HEATING / COOLING')}
  {ynu_tbl([
    ynu_row('D1','Are you aware of any problems with the electrical system (wiring, panel, knob and tube, aluminum wiring)?', 'no'),
    ynu_row('D2','Are you aware of any problems with the heating system (furnace, boiler, heat pump)?', 'no'),
    ynu_row('D3','Does the property have a wood-burning fireplace or stove?'),
    ynu_row('D4','Is the property connected to natural gas?', 'yes'),
    ynu_row('D5','Are you aware of any problems with the cooling system?', 'no'),
  ])}

  {sec('E.  ENVIRONMENTAL / SAFETY')}
  {ynu_tbl([
    ynu_row('E1','Is there any known soil contamination, underground storage tanks, or environmental hazards?', env,
            ', '.join(d(L,'environmentalIssues') or [])),
    ynu_row('E2','Has the property been used as a marijuana grow operation or drug lab at any time?', grow),
    ynu_row('E3','Are you aware of any lead paint, vermiculite insulation, or urea formaldehyde foam insulation?'),
    ynu_row('E4','Has the property been tested for radon gas?'),
    ynu_row('E5','Are there any known safety hazards (unguarded pools, unsafe decks, etc.)?', 'no'),
  ])}

  {sec('F.  GENERAL')}
  {ynu_tbl([
    ynu_row('F1','Are you aware of any material latent defects in the property not covered in the above sections?'),
    ynu_row('F2','Is there a homeowner warranty on the property?'),
    ynu_row('F3','Has the property had a professional home inspection in the last 3 years?'),
  ])}

  <div style="margin-top:12px">
    <strong style="font-size:9pt;color:#141e3c">Additional Details / Explanations:</strong>
    {field_ta('', ', '.join(d(L,"knownDefects") or []), rows=4)}
  </div>

  {pg_footer('Property Disclosure Statement — Form 5A', 2, 3)}
</div>'''

    # Pre-compute pds_sellers_sigs_html to avoid nested f-strings
    pds_sellers_sigs_html = ""
    for i, s in enumerate(Ss[:2]):
        pds_sellers_sigs_html += f'''
  <p style="font-size:8pt;font-weight:700;color:#666;margin-bottom:6px">{"First" if i==0 else "Second"} Seller</p>
  <div class="sig-section"><div class="sig-row">{sig_block("Seller Signature")}<div class="sig-col"><div class="sig-line"><div class="sig-label">Print Full Name</div><input type="text" class="date-field" value="{e(s.get("fullName",""))}"></div></div></div></div>
  '''

    p3 = f'''<div class="page">
  {cont_bar('PROPERTY DISCLOSURE STATEMENT — RESIDENTIAL  (continued)')}

  {sec('G.  STRATA / CONDOMINIUM' + (' (complete only if applicable)' if not is_strata else ''), '#141e3c' if is_strata else '#888')}
  {ynu_tbl([
    ynu_row('G1','Is the property part of a strata corporation?', 'yes' if is_strata else 'no'),
    ynu_row('G2','Are you aware of any current or pending special levies?'),
    ynu_row('G3','Are there any restrictions on pets, rentals, or age (55+ community)?'),
    ynu_row('G4','Is the contingency reserve fund adequate to your knowledge?', 'unknown'),
  ])}
  {cols(field('Strata Plan Number', e(d(L,'strataNum'))),
        field('Monthly Strata Fee', f'${e(d(L,"strataFee"))}' if d(L,'strataFee') else '')) if is_strata else ''}

  {sec('SELLER DECLARATION', '#BE0000')}
  {notice("The Seller(s) represent(s) that the information provided in this Property Disclosure Statement is accurate to the best of the Seller's knowledge as of the date signed below. The Seller(s) acknowledge(s) that this statement is not a warranty and that the Seller(s) is/are obligated to disclose <strong>material latent defects</strong> known to the Seller(s) that would not be apparent on a reasonable inspection. Buyers are strongly encouraged to conduct their own independent property inspection.")}

  <div style="height:12px"></div>
  {pds_sellers_sigs_html}

  {sec('BUYER ACKNOWLEDGMENT OF RECEIPT', '#888')}
  {notice("The Buyer(s) acknowledge(s) receipt of a copy of this Property Disclosure Statement. The Buyer(s) acknowledge(s) that the statements contained herein are those of the Seller(s) and not the listing or selling brokerage.")}
  <div class="sig-section"><div class="sig-row">{sig_block("Buyer Signature")}</div></div>

  {pg_footer('Property Disclosure Statement — Form 5A', 3, 3)}
</div>'''

    return _base('PDS — Property Disclosure Statement Residential (Form 5A)', p1 + p2 + p3)


# ══════════════════════════════════════════════════════════════════════════════
#  4. FINTRAC — Individual Identification Information Record
# ══════════════════════════════════════════════════════════════════════════════

def html_fintrac(data):
    cfg = data.get('cfg', {}); L = data.get('listing', {})
    Ss  = sellers_list(L)

    def seller_block(s, idx):
        lname = s.get('fullName','').split()[-1] if s.get('fullName') else ''
        fname = ' '.join(s.get('fullName','').split()[:-1]) if s.get('fullName') else ''
        id_types = {'drivers_license':"Driver's Licence",'passport':'Passport',
                    'provincial_id':'Provincial Photo ID','permanent_resident':'Permanent Resident Card','citizenship':'Citizenship Certificate'}
        id_type = id_types.get(s.get('idType',''), s.get('idType',''))
        cit_str = 'Non-Resident of Canada' if s.get('citizenship') == 'non_resident' else 'Canadian Citizen / Permanent Resident'
        addr = s.get('address') or d(L,'propAddress','')

        return f'''
  <div style="border:1px solid #003087;border-radius:5px;padding:14px;margin-bottom:16px">
    <div style="font-size:8.5pt;font-weight:700;color:#003087;text-transform:uppercase;margin-bottom:10px">
      Client #{idx+1} Identification Record
    </div>

    <div style="font-size:8pt;font-weight:700;color:#003087;background:#f0f3fa;padding:5px 8px;margin:10px 0 8px;border-left:3px solid #003087">
      SECTION 1 — PERSONAL INFORMATION
    </div>
    {cols(field('Last Name', lname), field('First Name and Middle Initial', fname))}
    {cols(field('Date of Birth (YYYY-MM-DD)', e(s.get('dob',''))), field('Country of Residence', 'Canada'))}
    {field('Full Residential Address (Street, City, Province, Postal Code)', addr)}
    {cols(field('Occupation', e(s.get('occupation',''))), field('Citizenship / Residency Status', cit_str))}
    {cols(field('Phone Number', e(s.get('phone',''))), field('Email Address', e(s.get('email',''))))}

    <div style="font-size:8pt;font-weight:700;color:#003087;background:#f0f3fa;padding:5px 8px;margin:10px 0 8px;border-left:3px solid #003087">
      SECTION 2 — GOVERNMENT-ISSUED PHOTO IDENTIFICATION
    </div>
    {cols(field('Type of Government-Issued Photo ID', id_type),
          field('ID Number', e(s.get('idNumber',''))),
          field('Expiry Date', e(s.get('idExpiry',''))))}
    {cols(field('Issuing Country', 'Canada'), field('Issuing Province/State', 'British Columbia'))}
    <div style="font-size:8.5pt;font-weight:700;margin:8px 0 4px">Verification Method:</div>
    <div style="display:flex;gap:20px;font-size:8.5pt">
      {chk('In-Person (Original Document)', True)}
      {chk('Credit File Method')}
      {chk('Dual Process Method')}
    </div>

    <div style="font-size:8pt;font-weight:700;color:#003087;background:#f0f3fa;padding:5px 8px;margin:10px 0 8px;border-left:3px solid #003087">
      SECTION 3 — THIRD PARTY DETERMINATION
    </div>
    <div style="display:flex;align-items:center;gap:16px;font-size:9pt;margin-bottom:8px">
      <span>Is the client acting on behalf of a third party?</span>
      {chk('Yes')} {chk('No', True)}
    </div>
    {cols(field('If Yes — Third Party Name', ''), field('Third Party Relationship', ''))}
  </div>'''

    clients_html = ''.join(seller_block(s, i) for i, s in enumerate(Ss[:2]))

    body = f'''<div class="page">
  {hdr_bar('FINTRAC','Financial Transactions and Reports Analysis Centre of Canada','INDIVIDUAL IDENTIFICATION','INFORMATION RECORD','#003087')}

  {notice('Pursuant to: <strong>Proceeds of Crime (Money Laundering) and Terrorist Financing Act</strong> — Identification of Clients<br>File Reference: {e(d(L,"id",""))}  ·  Record Completed: {today()}')}

  {clients_html}

  {sec('SECTION 4 — RISK ASSESSMENT', '#003087')}
  <div style="font-size:9pt;font-weight:700;margin-bottom:8px">Overall Risk Level:</div>
  {radio_pair('risk_level',
    '<strong>Low:</strong> Meets expected profile for a real estate transaction; no unusual factors',
    '<strong>Medium:</strong> Some factors require enhanced scrutiny', checked=1)}
  <div class="radio-row">
    <input type="radio" name="risk_level" value="3">
    <label><strong>High:</strong> Significant unusual factors; enhanced due diligence required</label>
  </div>
  {field('Risk Assessment Notes', '')}

  {sec('SECTION 5 — COMPLETED BY REAL ESTATE PROFESSIONAL', '#003087')}
  {cols(field('Agent / Licensee Name', e(d(cfg,'agentName'))),
        field('License Number', e(d(cfg,'agentLicense'))))}
  {cols(field('Brokerage', e(d(cfg,'brokerage'))), field('Date of Verification', today()))}
  <div class="sig-section"><div class="sig-row">{sig_block("Agent Signature", pre_name=e(d(cfg,'agentName')))}</div></div>

  {pg_footer('FINTRAC Individual Identification Information Record', 1, 1, 'FINTRAC / CANAFE')}
</div>'''

    return _base('FINTRAC — Individual Identification Information Record', body)


# ══════════════════════════════════════════════════════════════════════════════
#  5. PRIVACY — BCREA Privacy Notice & Consent
# ══════════════════════════════════════════════════════════════════════════════

def html_privacy(data):
    cfg = data.get('cfg', {}); L = data.get('listing', {})
    Ss  = sellers_list(L); S = Ss[0]
    prop = d(L,'propAddress','')

    # Pre-compute privacy_consent_notice and privacy_sellers_sigs_html to avoid nested f-strings
    privacy_consent_notice = notice('''I/We hereby consent to the collection, use, and disclosure of my/our personal information by the listing brokerage and its agents for the purposes described above. I/We understand that:
  <ul style="margin-top:6px;padding-left:18px;line-height:1.7">
    <li>I/We may withdraw this consent at any time, subject to legal and contractual restrictions.</li>
    <li>Withdrawal of consent may affect the brokerage's ability to provide real estate services.</li>
    <li>I/We have received, read, and understood this Privacy Notice.</li>
  </ul>''')

    privacy_sellers_sigs_html = ""
    for i, s in enumerate(Ss[:2]):
        privacy_sellers_sigs_html += f'''
  <p style="font-size:8pt;font-weight:700;color:#666;margin-bottom:6px">{"First" if i==0 else "Second"} Seller</p>
  <div class="sig-section"><div class="sig-row">{sig_block(f"Seller Signature — {e(s.get('fullName',''))}")}</div></div>
  '''

    body = f'''<div class="page">
  {hdr_bar('BCREA','British Columbia Real Estate Association','PRIVACY NOTICE AND CONSENT','Personal Information Protection Act (PIPA)','#BE0000')}

  <div style="display:flex;justify-content:flex-end;margin-bottom:8px"><span style="font-size:8pt;color:#666">Date: {today()}</span></div>
  {field("Seller(s) Full Name(s)", ", ".join(s.get("fullName","") for s in Ss[:2] if s.get("fullName")))}
  {field('Property Address', prop)}

  {sec('COLLECTION AND USE OF PERSONAL INFORMATION')}

  <p style="font-size:9pt;margin-bottom:10px"><strong>Purpose of Collection:</strong> Your real estate professional collects your personal information for the purposes of providing real estate services, including listing your property, marketing your property, facilitating transactions, complying with legal obligations (including FINTRAC), and communicating with you about your real estate transaction.</p>

  <p style="font-size:9pt;margin-bottom:10px"><strong>Types of Information Collected:</strong> Name, address, date of birth, government-issued identification, phone number, email address, financial information related to the transaction, and information about your property.</p>

  <p style="font-size:9pt;margin-bottom:10px"><strong>Disclosure to Third Parties:</strong> Your information may be shared with other real estate professionals involved in your transaction, the local real estate board/MLS®, lawyers/notaries, mortgage brokers, strata management companies, BC Assessment, and government bodies as required by law.</p>

  <p style="font-size:9pt;margin-bottom:10px"><strong>MLS® Publication:</strong> By listing your property on the MLS®, certain property information (but not your personal contact information) will be made available to real estate professionals and their clients through the MLS® system.</p>

  <p style="font-size:9pt;margin-bottom:10px"><strong>Retention:</strong> Your personal information will be retained for a minimum period as required by applicable legislation, including the Real Estate Services Act and FINTRAC requirements (minimum 5 years).</p>

  <p style="font-size:9pt;margin-bottom:14px"><strong>Access and Correction:</strong> You have the right to access your personal information held by your brokerage and to request corrections to any inaccurate information. Contact: {e(d(cfg,'agentEmail'))} · {e(d(cfg,'agentPhone'))}</p>

  {sec('CONSENT', '#BE0000')}

  {privacy_consent_notice}

  <div style="height:14px"></div>
  {privacy_sellers_sigs_html}

  {pg_footer('Privacy Notice & Consent (PIPA)', 1, 1)}
</div>'''

    return _base('Privacy Notice & Consent — BCREA', body)


# ══════════════════════════════════════════════════════════════════════════════
#  6. C3 — Consent to Contact
# ══════════════════════════════════════════════════════════════════════════════

def html_c3(data):
    cfg = data.get('cfg', {}); L = data.get('listing', {})
    Ss  = sellers_list(L); S = Ss[0]

    body = f'''<div class="page">
  {hdr_bar('BCREA  ·  REALTOR®','Real Estate Client Communication Authorization','CONSENT TO CONTACT — C3 FORM','Canada Anti-Spam Legislation (CASL)','#141e3c')}

  <div style="display:flex;justify-content:flex-end;margin-bottom:8px"><span style="font-size:8pt;color:#666">Date: {today()}</span></div>
  {field('Client Full Name', e(S.get('fullName','')))}
  {cols(field('Phone Number', e(S.get('phone',''))), field('Email Address', e(S.get('email',''))))}

  {sec('CONSENT FOR CONTACT')}

  <p style="font-size:9.5pt;margin-bottom:12px">
    I, <strong>{e(S.get("fullName","the undersigned"))}</strong>, hereby consent to being contacted by
    <strong>{e(d(cfg,"agentName","the real estate professional"))}</strong> of
    <strong>{e(d(cfg,"brokerage","the brokerage"))}</strong>
    by phone, text message, and/or email for the following purposes:
  </p>

  {chk('Communications related to the listing and sale of my property', True)}
  {chk('Market updates and comparable sales information', True)}
  {chk('Follow-up communications after the listing period expires')}
  {chk('Future real estate investment opportunities')}
  {chk('Newsletter and market report communications')}
  {chk('Home services referrals (mortgage, legal, home inspection, etc.)')}

  {sec("CANADA'S ANTI-SPAM LEGISLATION (CASL) NOTICE", '#BE0000')}

  {notice("In accordance with Canada's Anti-Spam Legislation (CASL), your express consent is required before sending commercial electronic messages (CEM). You may withdraw your consent at any time by contacting the brokerage at <strong>{e(d(cfg,'agentEmail'))}</strong>. Withdrawal of consent does not affect communications directly related to an active listing agreement.", 'warning')}

  <div style="height:14px"></div>

  <div class="sig-section"><div class="sig-row">{sig_block(f"Client Signature — {e(S.get('fullName',''))}")}</div></div>

  <div style="margin-top:20px">
    {field('Agent / Brokerage (confirming consent obtained)', e(d(cfg,'agentName')) + '  ·  ' + e(d(cfg,'brokerage')))}
  </div>

  {pg_footer('Consent to Contact (C3) — CASL', 1, 1)}
</div>'''

    return _base('C3 — Consent to Contact (CASL)', body)


# ══════════════════════════════════════════════════════════════════════════════
#  7. DRUP — Disclosure to an Unrepresented Party
# ══════════════════════════════════════════════════════════════════════════════

def html_drup(data):
    cfg = data.get('cfg', {}); L = data.get('listing', {})

    body = f'''<div class="page">
  {hdr_bar('BCFSA  ·  BCREA','BC Financial Services Authority / BC Real Estate Association','DISCLOSURE TO AN UNREPRESENTED PARTY','Real Estate Services Rules — Section 55','#009DAE')}

  <div style="display:flex;justify-content:flex-end;margin-bottom:8px"><span style="font-size:8pt;color:#666">Date: {today()}</span></div>
  {field('Unrepresented Party (Buyer/Other) — Full Name', '')}
  {field('Property Address', e(d(L,'propAddress')))}

  {sec('REAL ESTATE PROFESSIONAL INFORMATION', '#009DAE')}
  {cols(field('Licensee Name', e(d(cfg,'agentName'))),
        field('License Number', e(d(cfg,'agentLicense'))))}
  {cols(field('Brokerage', e(d(cfg,'brokerage'))),
        field('Phone / Email', f'{e(d(cfg,"agentPhone"))}  {e(d(cfg,"agentEmail"))}'))}

  {sec('DISCLOSURE OF LIMITED DUTIES', '#009DAE')}

  <p style="font-size:9.5pt;margin-bottom:10px">
    The real estate professional named above is acting as agent for the <strong>Seller(s) only</strong> in this transaction.
    The licensee is <strong>NOT</strong> representing you as a client and does NOT owe you the following duties:
  </p>

  {chk('<strong>No loyalty:</strong> The licensee is loyal to the Seller, not to you. They may be representing a client with competing interests.')}
  {chk('<strong>No duty of full disclosure:</strong> The licensee does not have a duty to give you all relevant information.')}
  {chk('<strong>No duty to avoid conflicts:</strong> The licensee is not acting in your interests.')}
  {chk('<strong>No confidentiality:</strong> The licensee may share information you provide with their client (the Seller).')}

  {sec('LIMITED SERVICES OFFERED', '#141e3c')}

  <p style="font-size:9pt;margin-bottom:8px">Although the licensee is not representing you as a client, the licensee is able to provide you with limited services, including:</p>
  {chk('Providing factual information about the property', True)}
  {chk('Providing general information about the transaction process', True)}
  {chk('Presenting your offers to the Seller and conveying counter-offers to you', True)}
  {chk('Acting honestly and with reasonable care and skill in your dealings', True)}

  {notice('<strong>RECOMMENDATION:</strong> You are strongly encouraged to seek independent legal advice and/or representation from your own real estate professional before entering into any agreement.', 'green')}

  {sec('ACKNOWLEDGMENT BY UNREPRESENTED PARTY', '#009DAE')}

  {notice('I acknowledge that I have read and understood this disclosure. I understand that the real estate professional named above is representing the Seller and is <strong>NOT</strong> my agent or representative in this transaction.')}

  <div style="height:10px"></div>
  <div class="sig-section"><div class="sig-row">{sig_block("Unrepresented Party Signature")}</div></div>

  {pg_footer('Disclosure to Unrepresented Party', 1, 1, 'BCFSA / BCREA')}
</div>'''

    return _base('DRUP — Disclosure to an Unrepresented Party', body)


# ══════════════════════════════════════════════════════════════════════════════
#  8. MLS — MLS Listing Data Input Sheet
# ══════════════════════════════════════════════════════════════════════════════

def html_mls(data):
    cfg = data.get('cfg', {}); L = data.get('listing', {})
    prop = d(L,'propAddress','')
    if d(L,'propUnit'): prop = f'{d(L,"propUnit")} - {prop}'
    start = d(L,'createdAt') or today_iso()
    try: start_fmt = date.fromisoformat(start).strftime('%Y-%m-%d')
    except: start_fmt = start
    expiry = expiry_date(start, d(L,'listDuration','90'))
    price_str = fmt_price(d(L,'listPrice'))
    is_strata = d(L,'propType') in ('condo','townhouse','strata')

    body = f'''<div class="page">
  {hdr_bar('MLS®','Multiple Listing Service® — REALTOR® Confidential','LISTING DATA INPUT SHEET',f'MLS#: {e(d(L,"mlsNumber","PENDING"))}  ·  Status: {e(d(L,"mlsStatus","Pending")).upper()}','#0c5f9a')}

  {notice(f'Prepared: {today()}  ·  Agent: {e(d(cfg,"agentName",""))}  ·  Brokerage: {e(d(cfg,"brokerage",""))}')}

  {sec('PROPERTY IDENTIFICATION', '#0c5f9a')}
  {field('Full Civic Address', prop)}
  {cols3(field('City / Municipality', e(d(L,'geo','city','Surrey'))),
         field('Province', 'BC'),
         field('Postal Code', e(d(L,'geo','postalCode',''))))}
  {cols(field('PID', e(d(L,'parcel','pid',''))),
        field('Legal Description', e(d(L,'parcel','parcelName',''))))}
  {cols3(field('Property Type', e(d(L,'propType','Detached').title())),
         field('Style of Home', ''),
         field('Year Built', e(d(L,'assessment','yearBuilt',''))))}

  {sec('LISTING DETAILS', '#0c5f9a')}
  {cols3(field('List Price', price_str),
         field('Annual Property Tax', e(d(L,'assessment','taxAmount',''))),
         field('Co-op Commission', e(d(L,'commissionBuyer','2.5')) + '%'))}
  {cols3(field('Listing Start Date', start_fmt),
         field('Expiry Date', expiry),
         field('Possession / Completion Date', e(d(L,'possessionDate',''))))}

  {sec('PROPERTY DETAILS', '#0c5f9a')}
  {cols(field('Bedrooms', e(d(L,'beds',''))),
        field('Bathrooms', e(d(L,'baths',''))),
        field('Parking Spaces', e(d(L,'parking',''))),
        field('Floor Area (sq ft)', e(d(L,'assessment','floorArea',''))))}
  {field('Inclusions', ', '.join(d(L,'inclusions') or []) or 'As per listing contract')}
  {field('Exclusions', ', '.join(d(L,'exclusions') or []) or 'None')}
  {field('Rental Equipment', ', '.join(d(L,'rentalEquipment') or []) or 'None')}
  {cols3(field('Strata Plan #', e(d(L,'strataNum',''))),
         field('Monthly Strata Fee', f'${e(d(L,"strataFee",""))}' if d(L,'strataFee') else ''),
         field('Strata Bylaws', e(d(L,'bylaw','')))) if is_strata else ''}

  {sec('PUBLIC REMARKS', '#0c5f9a')}
  {field_ta('(visible to buyers on realtor.ca)', e(d(L,'mlsRemarks','')), rows=5)}

  {sec('REALTOR® ONLY REMARKS (CONFIDENTIAL)', '#BE0000')}
  {field_ta('(visible to REALTORS® only — not shown to buyers)', e(d(L,'mlsRealtorRemarks','')), rows=3)}

  {sec('SHOWING INSTRUCTIONS', '#141e3c')}
  {field('Showing Method / Instructions', e(d(L,'showingInstructions','')))}
  {cols(field('Lockbox Code (REALTOR® Confidential)', e(d(L,'lockboxCode',''))),
        field('Additional Showing Notes', e(d(L,'showingNotes',''))))}

  <div class="sig-section"><div class="sig-row">{sig_block(f"Listing Agent Signature — {e(d(cfg,'agentName',''))}", date_val=today())}</div></div>

  {pg_footer('MLS Listing Data Input Sheet', 1, 1, 'REALTOR®')}
</div>'''

    return _base('MLS — Listing Data Input Sheet', body)


# ══════════════════════════════════════════════════════════════════════════════
#  9. MKTAUTH — Marketing Authorization
# ══════════════════════════════════════════════════════════════════════════════

def html_mktauth(data):
    cfg = data.get('cfg', {}); L = data.get('listing', {})
    Ss  = sellers_list(L)

    # Pre-compute mktauth_rows_html and mktauth_sellers_sigs_html to avoid nested f-strings
    mktauth_rows_html = ""
    for act, chkd in [
        ('MLS® Listing', True), ('Professional Photography', True), ('Virtual / 3D Tour', True),
        ('Internet Advertising (realtor.ca, portals)', True), ('Social Media (Facebook, Instagram, LinkedIn)', True),
        ('Print Advertising (flyers, newspaper)', True), ('For Sale Sign', True), ('Open Houses', True),
        ('Drone / Aerial Photography', False), ('Floor Plans', True), ('Just Listed / Just Sold Postcards', True),
    ]:
        mktauth_rows_html += f'''<tr style="border-bottom:1px solid #eee">
      <td style="padding:7px 6px"><input type="checkbox" {"checked" if chkd else ""} style="width:14px;height:14px;accent-color:#4f35d2;cursor:pointer"></td>
      <td style="padding:7px 6px;font-weight:600;font-size:9pt">{act}</td>
      <td style="padding:7px 6px"><input type="text" placeholder="(restrictions / notes)" style="width:100%;border:none;border-bottom:1px solid #ccc;background:transparent;font-size:9pt;padding:2px 2px"></td>
    </tr>'''

    mktauth_sellers_sigs_html = ""
    for i, s in enumerate(Ss[:2]):
        mktauth_sellers_sigs_html += f'''
  <p style="font-size:8pt;font-weight:700;color:#666;margin-bottom:6px">{"First" if i==0 else "Second"} Seller</p>
  <div class="sig-section"><div class="sig-row">{sig_block(f"Seller Signature — {e(s.get('fullName',''))}")}</div></div>
  '''

    body = f'''<div class="page">
  {hdr_bar(e(d(cfg,"brokerage","BROKERAGE")),'Real Estate Brokerage','MARKETING AUTHORIZATION','Seller Authorization for Property Marketing Activities','#141e3c')}

  <div style="display:flex;justify-content:flex-end;margin-bottom:8px"><span style="font-size:8pt;color:#666">Date: {today()}</span></div>
  {field("Seller(s) Name(s)", ", ".join(s.get("fullName","") for s in Ss[:2] if s.get("fullName")))}
  {field('Property Address', e(d(L,'propAddress','')))}

  {sec('MARKETING ACTIVITIES AUTHORIZED')}

  <p style="font-size:9.5pt;margin-bottom:12px">I/We authorize the brokerage to conduct the following marketing activities for my/our property:</p>

  <table style="width:100%;border-collapse:collapse;font-size:9pt">
    <tr style="background:#f0f0f8">
      <th style="text-align:left;padding:6px;font-size:8pt;color:#444;width:30px"></th>
      <th style="text-align:left;padding:6px;font-size:8pt;color:#444">Marketing Activity</th>
      <th style="text-align:left;padding:6px;font-size:8pt;color:#444">Details / Restrictions</th>
    </tr>
    {mktauth_rows_html}
  </table>

  {sec('PHOTOGRAPHY / MEDIA CONSENT', '#BE0000')}

  {notice("I/We grant the brokerage and its agents a non-exclusive, royalty-free licence to use photographs, videos, and other media of the property for marketing purposes during and after the listing period, including use in the agent's portfolio and testimonials (property address only, not seller names).")}

  {field('Special Instructions / Restrictions', e(d(L,'showingNotes','')))}
  <div style="height:10px"></div>

  {mktauth_sellers_sigs_html}

  {pg_footer('Marketing Authorization', 1, 1)}
</div>'''

    return _base('Marketing Authorization', body)


# ══════════════════════════════════════════════════════════════════════════════
#  10. AGENCY — Agency Confirmation
# ══════════════════════════════════════════════════════════════════════════════

def html_agency(data):
    cfg = data.get('cfg', {}); L = data.get('listing', {})
    Ss  = sellers_list(L); ba = L.get('buyerAgent') or {}

    # Pre-compute agency_sellers_info_html and agency_sellers_sigs_html to avoid nested f-strings
    agency_sellers_info_html = ""
    for i, s in enumerate(Ss[:2]):
        agency_sellers_info_html += cols(field(f"Seller {'#1' if i==0 else '#2'} — Full Name", e(s.get('fullName',''))),
                                         field('Phone', e(s.get('phone',''))))

    agency_sellers_sigs_html = ""
    for i, s in enumerate(Ss[:2]):
        agency_sellers_sigs_html += f'''
  <p style="font-size:8pt;font-weight:700;color:#666;margin-bottom:6px">{"First" if i==0 else "Second"} Seller</p>
  <div class="sig-section"><div class="sig-row">{sig_block(f"Seller Signature — {e(s.get('fullName',''))}")}</div></div>
  '''

    body = f'''<div class="page">
  {hdr_bar('BCREA  ·  BCFSA','Confirmation of Representation','AGENCY CONFIRMATION','Real Estate Services Rules','#009DAE')}

  <div style="display:flex;justify-content:flex-end;margin-bottom:8px"><span style="font-size:8pt;color:#666">Date: {today()}</span></div>
  {field('Property Address', e(d(L,'propAddress','')))}

  {sec('LISTING BROKERAGE', '#009DAE')}

  <p style="font-size:10pt;margin-bottom:12px">
    <strong>{e(d(cfg,'brokerage','the Listing Brokerage'))}</strong>, through its authorized representative
    <strong>{e(d(cfg,'agentName','the Listing Agent'))}</strong>
    (License #: {e(d(cfg,'agentLicense',''))}),
    is acting as the agent of the <strong>SELLER(S)</strong> in this transaction.
  </p>

  {cols(field('Listing Brokerage', e(d(cfg,'brokerage'))),
        field('Listing Agent', e(d(cfg,'agentName'))))}
  {cols(field('License Number', e(d(cfg,'agentLicense'))),
        field('Phone / Email', f'{e(d(cfg,"agentPhone",""))}  {e(d(cfg,"agentEmail",""))}'))}

  {sec("SELLER(S)", '#009DAE')}
  {agency_sellers_info_html}

  {sec("BUYER'S REPRESENTATIVE (if known)", '#141e3c')}
  {cols(field("Buyer's Brokerage", e(ba.get('brokerage',''))),
        field("Buyer's Agent Name", e(ba.get('name',''))))}
  {'' if ba.get('name') else notice("If the buyer is unrepresented, a separate Disclosure to an Unrepresented Party (DRUP) form is required.", 'warning')}

  {sec('ACKNOWLEDGMENT', '#009DAE')}

  {notice('All parties acknowledge that the above accurately describes the agency relationships in this transaction. Each party has had the opportunity to receive the BCFSA consumer information page (DORTS form) and understands the nature of representation (or lack thereof) in this transaction.')}

  <div style="height:12px"></div>
  {agency_sellers_sigs_html}

  <div class="sig-section"><div class="sig-row">{sig_block(f"Listing Agent — {e(d(cfg,'agentName',default=''))}", pre_name=e(d(cfg,'agentName',default='').split()[0] if d(cfg,'agentName') else ''))}</div></div>

  {pg_footer('Agency Confirmation', 1, 1, 'BCREA / BCFSA')}
</div>'''

    return _base('Agency Confirmation — BCREA / BCFSA', body)


# ══════════════════════════════════════════════════════════════════════════════
#  11. C3CONF — Privacy Consent Confirmation Record
# ══════════════════════════════════════════════════════════════════════════════

def html_c3conf(data):
    cfg = data.get('cfg', {}); L = data.get('listing', {})
    Ss  = sellers_list(L); S = Ss[0]

    def consent_row(name, desc, obtained=True):
        c = 'checked' if obtained else ''
        bg = '#f0faf5' if obtained else '#fff8f0'
        clr = '#065f46' if obtained else '#92400e'
        status = f'<span style="color:{clr};font-size:8pt;font-weight:700">{"✔ Obtained " + today() if obtained else "⚠ PENDING"}</span>'
        return f'''<tr style="border-bottom:1px solid #eee;background:{bg}">
  <td style="padding:8px 6px;width:36px;text-align:center"><input type="checkbox" {c} style="width:14px;height:14px;accent-color:#065f46;cursor:pointer"></td>
  <td style="padding:8px 6px">
    <div style="font-weight:700;font-size:9pt;color:#141e3c">{name}</div>
    <div style="font-size:8pt;color:#666;margin-top:2px">{desc}</div>
  </td>
  <td style="padding:8px 12px;white-space:nowrap">{status}</td>
</tr>'''

    body = f'''<div class="page">
  <div style="text-align:center;padding:14px 0;border-bottom:2px solid #141e3c;margin-bottom:18px">
    <div style="font-size:14pt;font-weight:800;color:#141e3c;text-transform:uppercase;letter-spacing:.06em">REALTOR® Privacy Consent Confirmation</div>
    <div style="font-size:9pt;color:#666;margin-top:4px">Record of Consent Obtained — Personal Information Protection Act (PIPA)</div>
  </div>

  <div style="display:flex;justify-content:flex-end;margin-bottom:8px"><span style="font-size:8pt;color:#666">Record Date: {today()}</span></div>
  {field('Client Name', e(S.get('fullName','')))}
  {cols(field('Phone', e(S.get('phone',''))), field('Email', e(S.get('email',''))))}
  {field('Property Address', e(d(L,'propAddress','')))}

  {sec('RECORD OF CONSENTS OBTAINED')}

  <table style="width:100%;border-collapse:collapse;margin:8px 0">
    <tr style="background:#141e3c">
      <th style="padding:7px 6px;color:#a0a0d0;font-size:7.5pt;text-transform:uppercase;letter-spacing:.06em;width:36px"></th>
      <th style="padding:7px 6px;color:#a0a0d0;font-size:7.5pt;text-transform:uppercase;letter-spacing:.06em;text-align:left">Consent</th>
      <th style="padding:7px 6px;color:#a0a0d0;font-size:7.5pt;text-transform:uppercase;letter-spacing:.06em;text-align:right">Status</th>
    </tr>
    {consent_row('Privacy Notice and Consent (PIPA)', 'Collection, use, and disclosure of personal information for real estate services')}
    {consent_row('Consent to Contact — CASL (C3 Form)', 'Permission to send commercial electronic messages')}
    {consent_row('FINTRAC Client Identification', 'Identity verification under Proceeds of Crime Act')}
    {consent_row('MLS® Data Authorization', 'Use of property information on MLS® and marketing materials')}
    {consent_row('Marketing Media Authorization', 'Use of photos and media for property marketing')}
  </table>

  {sec('AGENT CERTIFICATION', '#BE0000')}

  {notice(f'I, <strong>{e(d(cfg,"agentName","the listing agent"))}</strong>, of <strong>{e(d(cfg,"brokerage","the brokerage"))}</strong>, certify that the above consents were obtained from the client in the manner and on the dates indicated, that the client was given the opportunity to ask questions, and that the consent was freely given.')}

  <div style="height:12px"></div>
  <div class="sig-section"><div class="sig-row">{sig_block(f"Agent Signature — {e(d(cfg,'agentName',''))}", pre_name=e(d(cfg,'agentName','')))}</div></div>
  {cols(field('License Number', e(d(cfg,'agentLicense',''))),
        field('Brokerage', e(d(cfg,'brokerage',''))))}

  {pg_footer('Privacy Consent Confirmation', 1, 1)}
</div>'''

    return _base('Privacy Consent Confirmation', body)


# ══════════════════════════════════════════════════════════════════════════════
#  12. FAIRHSG — Fair Housing Statement
# ══════════════════════════════════════════════════════════════════════════════

def html_fairhsg(data):
    cfg = data.get('cfg', {}); L = data.get('listing', {})
    Ss  = sellers_list(L)

    # Pre-compute fairhsg_rows_html and fairhsg_sellers_sigs_html to avoid nested f-strings
    fairhsg_rows_html = ""
    for ground, detail in [
        ('Race', 'No person shall be denied the opportunity to purchase, sell, rent, or lease real property based on race.'),
        ('Colour / Ethnic Origin', 'Discrimination based on skin colour, ethnicity, or ancestry is prohibited.'),
        ('Religion', 'Religious beliefs or practices cannot be used as a basis for housing decisions.'),
        ('Marital Status', 'Single, married, separated, divorced, or widowed status cannot restrict housing access.'),
        ('Family Status', 'The presence of children or family composition cannot be used to deny housing.'),
        ('Physical or Mental Disability', 'Disability (including the use of assistance animals) cannot restrict housing access.'),
        ('Sex / Gender Identity', 'Gender, gender identity, and sexual orientation are protected grounds.'),
        ('Age', 'Age cannot be used to restrict housing access (subject to lawful 55+ restrictions).'),
        ('Political Belief', 'Political affiliation or belief cannot affect housing rights.'),
        ('Source of Income', 'Income type (employment, disability, social assistance) cannot restrict tenancy rights.'),
        ('Place of Origin', 'National origin or place of origin cannot restrict housing access.'),
    ]:
        fairhsg_rows_html += f'''<tr style="border-bottom:1px solid #eee">
  <td style="padding:6px 8px;width:34px"><input type="checkbox" checked style="width:13px;height:13px;accent-color:#145a16;cursor:pointer"></td>
  <td style="padding:6px 8px;font-weight:700;color:#145a16;width:200px">{ground}</td>
  <td style="padding:6px 8px;font-size:8.5pt;color:#333">{detail}</td>
</tr>'''

    fairhsg_ack_notice = notice('''I/We, the Seller(s), acknowledge that I/we:
  <ul style="margin-top:6px;padding-left:18px;line-height:1.7">
    <li>Will not discriminate in the sale of my/our property on any protected ground under the BC Human Rights Code.</li>
    <li>Understand that any instruction to my agent to discriminate is unlawful and will not be followed.</li>
    <li>Will not instruct my agent to restrict who may view or make offers on my property based on any protected ground.</li>
    <li>Have read and understand this Fair Housing Statement.</li>
  </ul>''', 'green')

    fairhsg_sellers_sigs_html = ""
    for i, s in enumerate(Ss[:2]):
        fairhsg_sellers_sigs_html += f'''
  <p style="font-size:8pt;font-weight:700;color:#666;margin-bottom:6px">{"First" if i==0 else "Second"} Seller</p>
  <div class="sig-section"><div class="sig-row">{sig_block(f"Seller Signature — {e(s.get('fullName',''))}")}</div></div>
  '''

    body = f'''<div class="page">
  {hdr_bar('BC FAIR HOUSING','British Columbia Human Rights Code  ·  Real Estate Services Act','FAIR HOUSING STATEMENT','Protected Grounds under the BC Human Rights Code','#145a16')}

  <div style="display:flex;justify-content:flex-end;margin-bottom:8px"><span style="font-size:8pt;color:#666">Date: {today()}</span></div>
  {field("Seller(s) Name(s)", ", ".join(s.get("fullName","") for s in Ss[:2] if s.get("fullName")))}
  {field('Property Address', e(d(L,'propAddress','')))}
  {cols(field('Listing Agent', e(d(cfg,'agentName',''))),
        field('Brokerage', e(d(cfg,'brokerage',''))))}

  {sec('FAIR HOUSING POLICY', '#145a16')}

  <p style="font-size:9.5pt;margin-bottom:12px">In British Columbia, the <strong>Human Rights Code</strong> prohibits discrimination in the purchase, sale, or lease of real property. Real estate professionals are legally prohibited from engaging in, facilitating, or allowing discriminatory practices based on:</p>

  <table style="width:100%;border-collapse:collapse;font-size:9pt">
    {fairhsg_rows_html}
  </table>

  {sec('SELLER ACKNOWLEDGMENT', '#145a16')}

  {fairhsg_ack_notice}

  <div style="height:12px"></div>
  {fairhsg_sellers_sigs_html}

  {pg_footer('Fair Housing Statement', 1, 1, 'BC Human Rights / BCREA')}
</div>'''

    return _base('Fair Housing Statement — BC Human Rights Code', body)


# ══════════════════════════════════════════════════════════════════════════════
#  DISPATCH
# ══════════════════════════════════════════════════════════════════════════════

FORM_HTML = {
    'dorts':   html_dorts,
    'mlc':     html_mlc,
    'pds':     html_pds,
    'fintrac': html_fintrac,
    'privacy': html_privacy,
    'c3':      html_c3,
    'drup':    html_drup,
    'mls':     html_mls,
    'mktauth': html_mktauth,
    'agency':  html_agency,
    'c3conf':  html_c3conf,
    'fairhsg': html_fairhsg,
}

def generate_html_form(form_key, data):
    """Return a complete HTML string for the given form key, filled with data."""
    fn = FORM_HTML.get(form_key)
    if not fn:
        raise ValueError(f'Unknown form key: {form_key}')
    return fn(data)


# ── CLI quick test ─────────────────────────────────────────────────────────
if __name__ == '__main__':
    import sys
    key  = sys.argv[1] if len(sys.argv) > 1 else 'mlc'
    demo = {
        'listing': {
            'id': 'LF-2025-00001', 'propAddress': '14532 108 Ave, Surrey, BC  V3R 1V5',
            'propUnit': '', 'propType': 'detached',
            'seller': [{'fullName': 'David Patel',   'dob': '1978-04-15', 'phone': '604-555-1234',
                        'email': 'dpatel@email.com', 'address': '14532 108 Ave, Surrey BC',
                        'occupation': 'Software Engineer', 'idType': 'drivers_license',
                        'idNumber': 'BC1234567',     'idExpiry': '2028-04-15', 'citizenship': 'canadian'},
                       {'fullName': 'Priya Patel',   'dob': '1980-09-22', 'phone': '604-555-5678',
                        'email': 'ppatel@email.com', 'address': '14532 108 Ave, Surrey BC',
                        'occupation': 'Registered Nurse', 'idType': 'passport',
                        'idNumber': 'CA9876543',     'idExpiry': '2030-09-22', 'citizenship': 'canadian'}],
            'geo': {'city': 'Surrey', 'postalCode': 'V3R 1V5'},
            'parcel': {'pid': '009-123-456', 'parcelName': 'Lot 12 DL5 Group 1 NWD Plan 12345'},
            'assessment': {'yearBuilt': '1998', 'floorArea': '2480', 'taxAmount': '$6,842'},
            'listPrice': '1389000', 'listDuration': '90', 'commissionSeller': '3.222',
            'commissionBuyer': '3.255', 'possessionDate': '2025-05-15', 'createdAt': '2025-02-15',
            'inclusions': ['Refrigerator', 'Washer/Dryer', 'Central Vacuum'],
            'exclusions': ['Dining Light Fixture'], 'rentalEquipment': ['Hot Water Tank'],
            'showingInstructions': 'Call 2hrs before. No shoes.', 'lockboxCode': '4521',
            'mlsRemarks': 'Stunning 4BD/3BA home in Guildford. Renovated kitchen, hardwood floors.',
            'mlsRealtorRemarks': 'Sellers motivated. Quick possession possible.',
            'knownDefects': [], 'unpermittedRenos': [], 'growOpHistory': False,
            'pendingLegal': False, 'environmentalIssues': [], 'tenantStatus': '',
            'mlsNumber': 'R2912345', 'mlsStatus': 'active',
            'buyerAgent': {'name': '', 'phone': '', 'email': '', 'brokerage': ''},
        },
        'cfg': {
            'agentName': 'Sarah Mitchell', 'agentLicense': '195432',
            'agentEmail': 'sarah@remaxsurrey.ca', 'agentPhone': '604-555-8877',
            'brokerage': 'RE/MAX City Realty',
            'brokerageAddress': '9090 King George Blvd, Surrey BC V3T 2V6',
        }
    }
    html_out = generate_html_form(key, demo)
    out_path = f'/sessions/jolly-fervent-fermat/mnt/CoWork/forms/{key}.html'
    with open(out_path, 'w') as f: f.write(html_out)
    print(f'✅  {key.upper()} form → {out_path}  ({len(html_out):,} chars)')
