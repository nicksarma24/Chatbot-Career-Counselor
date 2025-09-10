import "./globals.css";

export const metadata = {
	title: "Career Counselor Chat",
	description: "Cohere-powered career counseling chatbot",
};

export default function RootLayout({ children }) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}


