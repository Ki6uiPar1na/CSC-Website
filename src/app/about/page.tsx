export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4">
      <h1 className="glitch-text text-3xl sm:text-4xl md:text-5xl mb-8">About JKKNIU-CSC</h1>
      
      <div className="space-y-6">
        <div className="card border-border-color">
          <h2 className="text-primary text-xl font-bold mb-4 uppercase tracking-wider border-b border-border-color pb-2 w-fit">Our Mission</h2>
          <p className="text-gray-400 leading-relaxed text-sm sm:text-base">
            The JKKNIU Cyber Security Club (JKKNIU-CSC) is a student-led organization at Jatiya Kabi Kazi Nazrul Islam University. 
            Our mission is to foster a community of security-minded individuals, providing a platform for learning, collaboration, 
            and professional development in the field of cyber security.
          </p>
        </div>

        <div className="card border-border-color">
          <h2 className="text-primary text-xl font-bold mb-4 uppercase tracking-wider border-b border-border-color pb-2 w-fit">What We Do</h2>
          <ul className="text-gray-400 space-y-3 list-none text-sm sm:text-base">
            <li className="flex items-start gap-3"><span className="text-accent mt-1">▹</span> <span>Regular hands-on workshops on various security domains.</span></li>
            <li className="flex items-start gap-3"><span className="text-accent mt-1">▹</span> <span>Organize intra-university Capture The Flag (CTF) competitions.</span></li>
            <li className="flex items-start gap-3"><span className="text-accent mt-1">▹</span> <span>Represent JKKNIU in national and international events.</span></li>
            <li className="flex items-start gap-3"><span className="text-accent mt-1">▹</span> <span>Research and share insights on security trends.</span></li>
            <li className="flex items-start gap-3"><span className="text-accent mt-1">▹</span> <span>Build a network between students and industry pros.</span></li>
          </ul>
        </div>

        <div className="card border-border-color">
          <h2 className="text-primary text-xl font-bold mb-4 uppercase tracking-wider border-b border-border-color pb-2 w-fit">University Identity</h2>
          <p className="text-gray-400 leading-relaxed text-sm sm:text-base">
            Named after the national poet of Bangladesh, Jatiya Kabi Kazi Nazrul Islam University (JKKNIU) is 
            committed to excellence in education. Our club upholds this spirit by pushing the boundaries of 
            technical innovation and ethical security practices.
          </p>
        </div>
      </div>

    </div>
  );
}
