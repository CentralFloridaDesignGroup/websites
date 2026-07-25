import { Button } from "cfdg/input"
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

export function Instructions({ onNext, markdownFile }: { onNext: () => void, markdownFile: string }) {
    const [markdown, setMarkdown] = useState("");

    useEffect(() => {
        document.title = "Closure Report Processor - The Compass";
    }, []);
    
    useEffect(() => {
        const loadMarkdown = async () => {
            const response = await fetch(markdownFile);
            if (!response.ok) {
                throw new Error(`Failed to load markdown: ${response.status}`);
            }
            const text = await response.text();
            setMarkdown(text);
        };

        loadMarkdown().catch((error) => {
            console.error(error);
            setMarkdown("# Instructions unavailable\nPlease try again later.");
        });
    }, []);

    return (
        <div className="max-w-7xl mx-auto">
            <section>
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold mb-4 grow">Instructions</h1>
                    <Button colorMode="auto"
                        label="Next Stage"
                        style="primary"
                        onClick={onNext}
                    />
                </div>
            </section>
            <div className="prose max-w-7xl mx-auto">
                <ReactMarkdown>{markdown}</ReactMarkdown>
            </div>
        </div>
    )
}