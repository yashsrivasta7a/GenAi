# ⚡ RAG AI Assistant

A modern, dark-themed AI-powered document analysis and chat assistant built with Next.js, featuring advanced glow effects and cyber aesthetics.

## ✨ Features

- **Dark Cyber Aesthetic**: Modern dark theme with glowing elements and animated backgrounds
- **Document Processing**: Upload PDFs or submit text content for AI analysis
- **Real-time Chat**: Interactive chat interface with the AI assistant
- **Vector Storage**: Uses Qdrant for efficient document embeddings storage
- **Azure OpenAI Integration**: Powered by Azure OpenAI for embeddings and chat completions
- **Responsive Design**: Fully responsive three-panel layout

## 🚀 Setup Instructions

### Prerequisites

1. **Qdrant Vector Database**: You need a running Qdrant instance
   ```bash
   # Using Docker
   docker run -p 6333:6333 qdrant/qdrant
   ```

2. **Azure OpenAI Service**: Set up an Azure OpenAI resource with:
   - Text embedding model (text-embedding-3-large)
   - GPT-4 model (gpt-4o)

### Installation

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   - Copy `.env.local` and fill in your Azure OpenAI credentials:
   ```env
   KEY=your_azure_openai_api_key_here
   INSTANCE_NAME=your_azure_openai_instance_name_here
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:3001` (or the available port)

## 🎨 Design Features

### Dark Aesthetic
- Gradient backgrounds with cyber-grid patterns
- Floating particle animations
- Glow effects on interactive elements
- Modern glassmorphism design

### Layout Structure
- **Left Panel**: Data input (text submission and file upload)
- **Middle Panel**: RAG document store with visual feedback
- **Right Panel**: Interactive chat interface

### Visual Effects
- Animated background particles
- Gradient borders with hover effects
- Glowing buttons and input fields
- Smooth transitions and animations
- Custom scrollbars

## 🔧 Technical Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API routes
- **AI**: Azure OpenAI (GPT-4, Text Embeddings)
- **Vector DB**: Qdrant
- **Document Processing**: LangChain
- **Icons**: Lucide React

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.js          # Chat endpoint
│   │   ├── upload-pdf/route.js    # PDF upload processing
│   │   └── submit-text/route.js   # Text content processing
│   ├── Pages/
│   │   └── HomePage/
│   │       └── HomePage.jsx       # Main UI component
│   ├── globals.css                # Global styles with glow effects
│   ├── layout.js                  # Root layout
│   └── page.js                    # Home page
```

## 🎯 Usage

1. **Upload Documents**: 
   - Drag and drop PDF files or click to browse
   - Submit text content directly in the text area

2. **View RAG Store**: 
   - Monitor processed documents in the middle panel
   - See document count and processing status

3. **Chat with AI**: 
   - Ask questions about your uploaded documents
   - Get AI-powered responses based on document content
   - View conversation history with timestamps

## 🛠️ Customization

### Styling
- Modify `globals.css` for glow effects and animations
- Adjust color gradients in the component files
- Customize particle animations and background effects

### AI Configuration
- Update model deployments in API routes
- Adjust chunk sizes for document processing
- Modify system prompts for different behaviors

## 🔒 Environment Variables

Required environment variables in `.env.local`:

```env
KEY=your_azure_openai_api_key
INSTANCE_NAME=your_azure_openai_instance_name
```

## 📝 Notes

- Ensure Qdrant is running on `http://localhost:6333`
- The app uses Azure OpenAI's latest API versions
- Documents are chunked for optimal retrieval performance
- All styling uses modern CSS features for the best visual experience

## 🚨 Troubleshooting

1. **Qdrant Connection Issues**: Ensure Qdrant is running and accessible
2. **Azure OpenAI Errors**: Verify your API keys and deployment names
3. **File Upload Issues**: Check file permissions and upload directory
4. **Styling Issues**: Ensure Tailwind CSS is properly configured

Enjoy your enhanced RAG AI Assistant! ⚡✨

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
