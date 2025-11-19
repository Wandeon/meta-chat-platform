# Knowledge Base Guide

**Last Updated:** 2025-11-19
**Time to Complete:** 15-30 minutes
**Difficulty:** Beginner-friendly

Your knowledge base is the brain of your chatbot. By uploading documents, you teach your AI chatbot to answer questions based on your specific information. This guide shows you how.

## What is a Knowledge Base?

Your **knowledge base** is a collection of documents that your chatbot uses to answer questions. Instead of just using general AI knowledge, your chatbot can answer questions specific to your business, products, or services.

### Examples

**E-commerce:** Upload product guides, FAQs, shipping policies
**Support:** Upload troubleshooting guides, documentation, policies
**Consulting:** Upload case studies, methodologies, frameworks
**Health:** Upload clinic info, treatment guides, policies

When a customer asks a question, the chatbot searches your knowledge base for relevant information and uses it to provide an accurate answer.

## How RAG Works (Simple Explanation)

RAG stands for "Retrieval-Augmented Generation". Here's what happens when someone asks a question:

1. **User asks:** "What's your shipping policy?"
2. **Chatbot searches:** Looks through your documents for shipping info
3. **Chatbot finds:** Relevant sections from your shipping policy document
4. **Chatbot thinks:** "Okay, here's what the documents say..."
5. **Chatbot answers:** Uses both the documents AND AI to create a response
6. **User sees:** An answer based on your actual policies

**Why this matters:**
- More accurate - based on your actual information
- More trustworthy - customers know it's from official docs
- Less hallucination - AI doesn't make up information
- Easy to update - just upload new documents

## Supported Document Formats

You can upload:

| Format | Best For | Notes |
|--------|----------|-------|
| **PDF** | Guides, policies, reports | Most popular format |
| **DOCX** | Microsoft Word documents | Maintains formatting |
| **TXT** | Plain text, simple docs | Great for FAQs |
| **CSV** | Tables, structured data | Perfect for product lists, pricing |

### What You Can't Upload (Yet)

- Images/screenshots only
- Audio/video files
- Email files (.msg, .eml)
- Spreadsheets (.xlsx)
- PowerPoint (.pptx)

**Note:** If you have Excel/PowerPoint, export as PDF first.

## Step 1: Prepare Your Documents

Before uploading, spend 5 minutes preparing your documents:

**Good Documents Have:**
- Clear structure (headings, sections)
- Specific information (not vague)
- Recent content (not outdated)
- Good quality (no scans with typos)

**Bad Documents:**
- 500+ pages (break into smaller docs)
- Scanned PDFs with bad OCR (fix or re-upload as text)
- Empty pages or corrupted files
- Outdated information

### Tips for Best Results

**Keep documents focused:**
- One topic per document
- 10-100 pages is ideal
- Longer documents are split automatically

**Use clear headings:**
```
# Product Overview
## Features
### How to Use
```

**Include specific details:**
- Exact prices, not "prices vary"
- Specific dates, not "recently"
- Complete procedures, not "we do it"

**Update regularly:**
- Remove outdated documents
- Add new documents monthly
- Replace if information changes

## Step 2: Upload Your First Document

**Go to Knowledge Base:**

1. Log into dashboard
2. Click **Knowledge Base** tab (left sidebar)
3. Click **Upload Document** or **Add Document**

**Select your document:**

1. Click **Choose File** button
2. Find your PDF, Word, or text file
3. Click **Open**

**Add document info:**

1. **Title:** What should we call this?
   - Example: "Product User Guide"
   - This helps you identify documents

2. **Description:** What's in this document? (optional)
   - Example: "Instructions for setting up Product X"
   - Helps the chatbot understand content

3. **Category:** (optional)
   - Organize by type: "Guides", "Policies", "FAQs"

**Click "Upload"**

You'll see a progress bar. This usually takes 30 seconds to 2 minutes depending on file size.

## Step 3: Understand the Processing

After you upload, Meta Chat processes your document:

### What Happens

1. **Parsing** - Reads the document content
2. **Chunking** - Splits into searchable pieces
3. **Embedding** - Creates AI-readable representations
4. **Indexing** - Makes it searchable
5. **Ready** - Document is now usable

### Why This Takes Time

- Large documents take longer (100+ pages = 2-5 minutes)
- Complex formatting takes extra processing
- System creates multiple searchable versions

### How to Check Status

1. Go to **Knowledge Base** tab
2. Find your document
3. Look at the status:
   - **Processing** - Still being prepared
   - **Ready** - Ready to use
   - **Error** - Something went wrong (see below)

## Step 4: Test Your Knowledge Base

Make sure your documents are actually being used:

**Test in the chatbot:**

1. Open your chatbot
2. Ask a question that should be in your documents
3. Example: If you uploaded a guide that says "Shipping takes 3-5 days"
4. Ask: "How long does shipping take?"
5. Should see: "Shipping takes 3-5 days" in the response

**Good signs:**
- Answer includes specific information from your docs
- Chatbot cites the document
- Information is accurate

**Bad signs:**
- Generic answer (sounds like no docs were used)
- "I don't know" responses to questions in your docs
- Irrelevant information

## Managing Your Knowledge Base

### View All Documents

1. Go to **Knowledge Base** tab
2. See list of all uploaded documents
3. Each shows:
   - Title
   - Upload date
   - File size
   - Status

### Update a Document

If information changes:

1. Find the document in Knowledge Base
2. Click **Update** or **Replace**
3. Upload the new version
4. Old version is automatically deleted
5. Chatbot uses new version immediately

### Delete a Document

If you no longer want to use a document:

1. Find the document
2. Click **Delete** or **Remove**
3. Confirm deletion
4. Document is removed within 1 minute

**Note:** Deleted documents won't affect past conversations, but future answers won't use them.

### Organize with Categories

Use categories to organize documents:

1. Go to **Knowledge Base Settings**
2. Create categories like:
   - "Product Guides"
   - "Policies"
   - "FAQs"
   - "Pricing"
3. When uploading, assign documents to categories
4. Helps you find documents quickly

## Best Practices

### What to Upload

**Perfect:**
- Product documentation
- FAQ lists
- Policy documents
- How-to guides
- Price lists
- Contact information

**Good:**
- Blog posts
- Company info
- Service descriptions
- Testimonials
- Case studies

**Not Ideal:**
- Raw data without context
- Very long books (500+ pages)
- Marketing materials only
- Outdated information

### Organization Tips

**Keep documents small:**
- Better: 5 short documents
- Worse: 1 long document
- Size guide: 10-100 pages per document

**Use descriptive titles:**
- Good: "Product X User Manual - v2.1"
- Bad: "Document1.pdf"

**Add descriptions:**
- Helps you remember what's in each doc
- Helps the AI understand context
- Takes 30 seconds per document

**Review regularly:**
- Monthly: Check if documents are still accurate
- Quarterly: Remove outdated documents
- When info changes: Update immediately

### Security & Privacy

**What NOT to upload:**
- Internal employee information
- Customer personal data
- Passwords or API keys
- Financial data
- Medical records (unless compliant)

**Your data is:**
- Encrypted in transit
- Stored securely
- Used only for your chatbot
- Not shared with anyone

## Troubleshooting

### Document Won't Upload

**First check:**
1. Is the file one of these formats?
   - PDF, DOCX, TXT, CSV
2. Is the file under 50MB?
3. Is your internet connection stable?

**If still stuck:**
1. Try a different browser
2. Try uploading a smaller document
3. Check if file is corrupted
   - Try opening it on your computer
   - If it won't open, file is corrupted

### Upload Fails / Error Message

**File too large:**
- Max size is 50MB
- Solution: Split into smaller documents

**Invalid format:**
- Only PDF, DOCX, TXT, CSV work
- Solution: Convert to one of these formats
- For Word/Excel: Save as PDF, then upload

**Corrupted file:**
- File won't open or read
- Solution: Re-export the file from source

### Document Is "Processing" Forever

**What's normal:**
- Small doc (< 10MB): 30 seconds - 1 minute
- Large doc (10-50MB): 2-5 minutes
- Very large doc (40-50MB): 5-10 minutes

**If still processing after 15 minutes:**
1. Refresh the page
2. Check your internet
3. Try uploading a different document
4. Contact support if problem persists

### Chatbot Doesn't Use My Documents

**First check:**
1. Is the document status "Ready"?
   - Not "Processing" or "Error"
2. Do you have at least one document uploaded?
3. Is the question related to your documents?

**Try these:**
1. Ask a very specific question from your docs
   - Example: If doc says "Shipping is $10", ask "How much is shipping?"
2. Check if document was processed correctly
   - Scanned PDFs sometimes don't work well
   - Try uploading as text instead
3. Look at the exact wording in your document
   - Question might use different words

**Scarred PDFs:**
- PDF from a scanner often doesn't work well
- Solution: OCR the PDF first
  - Use free tools like PDFtron or Online OCR
  - Or re-scan with better quality

### Knowledge Base is Getting Too Large

**Performance tip:**
- Keep under 500 documents for best performance
- Over 500 documents = slower search

**What to do:**
1. Delete old/outdated documents
2. Combine related documents into one
3. Archive less-used documents

## Advanced Features

### CSV Files

CSV (spreadsheet) files work great for structured data like:
- Product lists with prices
- Service options
- Pricing tables

**Format your CSV well:**
```
Name,Price,Description
Product A,$99,"Best seller"
Product B,$149,"Premium version"
```

First row should be column headers.

### Chunking Strategy

Documents are automatically split into chunks. The default is usually fine, but you can optimize:

- **Small chunks:** Better for specific questions
- **Large chunks:** Better for overall understanding
- **Best:** Let system auto-detect

Contact support to customize chunking.

### Semantic Search

The system uses semantic search - meaning it understands meaning, not just keywords.

**This works:**
- Document says: "We accept VISA and Mastercard"
- Question: "What payment methods do you take?"
- Answer: Found! (even though keywords don't match)

## Examples

### Example 1: Product Company

**Documents to upload:**
1. Product overview and features
2. Pricing and packages
3. Installation guide
4. Troubleshooting guide
5. FAQ document
6. Support policies

**Result:** Chatbot can answer almost any customer question

### Example 2: Support Service

**Documents to upload:**
1. Common issues and solutions
2. Contact information
3. Business hours
4. Service agreements
5. Escalation procedures

**Result:** Chatbot handles 80% of support tickets automatically

### Example 3: Consulting Firm

**Documents to upload:**
1. Service descriptions
2. Case studies
3. Methodologies
4. Team information
5. Pricing and packages

**Result:** Chatbot qualifies leads and answers initial questions

## Next Steps

Your knowledge base is ready! What comes next?

### To Customize Your Chatbot
Go to: [Customization Guide](customization.md)

Learn how to:
- Change colors and appearance
- Customize messages
- Set operating hours

**Time needed:** 10-20 minutes

### To Deploy Your Chatbot
Go to: [Widget Installation Guide](widget-installation.md)

If you haven't deployed yet, here's how to add the widget to your website.

**Time needed:** 10-15 minutes

### To Monitor Conversations
See: [Troubleshooting Guide](troubleshooting.md)

Learn how to:
- View what users are asking
- Find gaps in your knowledge base
- Improve over time

## Key Takeaways

- Knowledge base = documents that train your chatbot
- Supported: PDF, DOCX, TXT, CSV
- Keep documents focused and well-organized
- Processing takes 30 seconds to 5 minutes
- Test questions to verify documents are being used
- Update documents when information changes

## Questions?

- **Upload stuck?** Check file format and size
- **Chatbot not using docs?** Verify status is "Ready"
- **Still need help?** Email support@metachats.ai

---

**Ready to continue?** Choose a next step above, or go back to the [documentation home](README.md).

**Last Updated:** 2025-11-19
**Word Count:** 1,847 words
