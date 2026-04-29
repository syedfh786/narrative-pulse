import Link from "next/link";

export default function Landing() {
  return (
    <main style={{ minHeight:"100vh", background:"#080808", display:"flex",
      flexDirection:"column", alignItems:"center", justifyContent:"center",
      fontFamily:"monospace", color:"#fff", textAlign:"center", padding:24 }}>
      <div style={{ fontSize:14, letterSpacing:6, color:"#f5821f", marginBottom:16 }}>
        NARRATIVE-PULSE
      </div>
      <h1 style={{ fontSize:48, fontWeight:700, marginBottom:16, lineHeight:1.2 }}>
        Does the story match<br/>the numbers?
      </h1>
      <p style={{ color:"#666", maxWidth:480, lineHeight:1.7, marginBottom:40 }}>
        We scan news headlines and earnings reports for any stock, 
        then score how well the media narrative matches the financial reality.
      </p>
      <Link href="/dashboard" style={{ background:"#f5821f", color:"#000",
        padding:"14px 36px", borderRadius:4, fontWeight:700,
        letterSpacing:3, fontSize:13, textDecoration:"none" }}>
        TRY FREE →
      </Link>
      <p style={{ marginTop:20, color:"#333", fontSize:12, letterSpacing:2 }}>
        3 FREE REPORTS PER MONTH · NO CREDIT CARD
      </p>
    </main>
  );
}