
import { GoogleGenAI, Type } from "@google/genai";
import type { AIRecommendation, SAC, Test } from '../types';

// Initialize the GoogleGenAI client with the API key from environment variables.
// This is the standard and secure way to configure the SDK.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Define the JSON schema for the AI's response. This ensures we get structured, predictable data.
const schema = {
  type: Type.OBJECT,
  properties: {
    recommendedSac: {
      type: Type.OBJECT,
      description: "The single best SAC package for the user's needs. This must be chosen from the provided list of available SACs.",
      properties: {
        code: {
          type: Type.STRING,
          description: "The code of the recommended SAC, e.g., 'SAC202'. Must be an exact code from the list.",
        },
        name: {
          type: Type.STRING,
          description: "The name of the recommended SAC, e.g., 'Homeowner'. Must correspond to the chosen code.",
        },
        reasoning: {
          type: Type.STRING,
          description: "A detailed explanation for why this specific SAC was chosen based on the user's query and the tests included in the SAC.",
        },
      },
      required: ["code", "name", "reasoning"],
    },
    additionalTests: {
      type: Type.ARRAY,
      description: "A list of individual tests that should be added on top of the recommended SAC. These tests must be chosen from the provided list of available individual tests and should not be redundant with tests already in the recommended SAC. Can be empty if no additional tests are needed.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: "The name of the additional recommended test. Must be an exact name from the list.",
          },
          reasoning: {
            type: Type.STRING,
            description: "A detailed explanation for why this additional test is recommended.",
          },
        },
        required: ["name", "reasoning"],
      },
    },
    overallExplanation: {
      type: Type.STRING,
      description: "A friendly, summary explanation of the recommendations provided to the user, tying everything together.",
    },
  },
  required: ["recommendedSac", "additionalTests", "overallExplanation"],
};


/**
 * Gets a SAC and test recommendation from the Gemini AI model.
 * @param description The user's description of their testing needs.
 * @param allSacs The list of all available SAC packages.
 * @param allTests The list of all available individual tests.
 * @returns A promise that resolves to an AIRecommendation object.
 */
export async function getRecommendation(
  description: string,
  allSacs: SAC[],
  allTests: Test[]
): Promise<AIRecommendation> {
  // Provide the AI with a clear role and instructions.
  const systemInstruction = `You are an expert assistant for the Pennsylvania Department of Environmental Protection (DEP), specializing in water and soil testing. Your task is to analyze a user's situation and recommend the most appropriate Standard Access Code (SAC) testing package and any necessary additional individual tests. 
  - You MUST use only the provided lists of available SACs and Tests.
  - Do not invent new SACs or tests.
  - Select the SAC that provides the best coverage for the user's concerns.
  - Recommend additional tests only if there are specific concerns not covered by the chosen SAC.
  - Provide clear, concise reasoning for each recommendation.`;

  // Simplify the data for the prompt to reduce token count and improve clarity for the model.
  const sacDataForPrompt = allSacs.map(s => ({
    code: s.code,
    name: s.name,
    description: s.description,
    tests: s.testIds
  }));

  const testDataForPrompt = allTests.map(t => t.name);

  // Construct the main prompt with all the necessary context.
  const contents = `
    User's situation: "${description}"
    
    Here is the list of available SAC packages. Each SAC includes a list of specific tests:
    ${JSON.stringify(sacDataForPrompt)}

    Here is the list of all available individual tests:
    ${JSON.stringify(testDataForPrompt)}

    Based on the user's situation and the available options, provide a recommendation in the specified JSON format. Your reasoning should be clear, helpful, and directly address the user's concerns.
    `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2, // Lower temperature for more deterministic, fact-based output
      },
    });

    const jsonText = response.text.trim();
    if (!jsonText) {
        throw new Error("The AI returned an empty response. Please try rephrasing your request.");
    }

    const parsedResponse = JSON.parse(jsonText);
    
    // The schema asks for `name` in additionalTests. The AIRecommendation type expects `id` and `name`.
    // The Test type has `id` and `name` as the same value, so we can map it here.
    const finalRecommendation: AIRecommendation = {
        ...parsedResponse,
        additionalTests: parsedResponse.additionalTests.map((test: { name: string; reasoning: string; }) => ({
            id: test.name, // Using name as ID, consistent with our app's data structure
            name: test.name,
            reasoning: test.reasoning,
        })),
    };

    return finalRecommendation;

  } catch (err: any) {
    console.error("Error calling Gemini API:", err);
    // Provide a more user-friendly error message
    let errorMessage = "An error occurred while communicating with the AI service. Please try again later.";
    if (err.message.includes('json')) {
      errorMessage = "The AI returned an invalid response. Please try rephrasing your request.";
    } else if (err.status >= 500) {
      errorMessage = "The AI service is currently unavailable. Please try again later.";
    } else if (err.status >= 400) {
      errorMessage = "There was an issue with the request to the AI service. Please check your prompt and try again.";
    }
    throw new Error(errorMessage);
  }
}
