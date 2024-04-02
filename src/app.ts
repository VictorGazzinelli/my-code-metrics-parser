import { extractMetrics } from './extractor';
import { ensureDirectoryCreatedAsync, extractZip, getFolderPath, readDir, tryRemoveDirectory, writeDataAsCsvToFileAsync } from './fileSystem';
import { Metrics } from './interfaces';

async function main() 
{
	const repos = readDir('repos');
	const reposPath: string[] = repos.filter(dirent => dirent.isFile() && dirent.name.endsWith('.zip')).map(zipFile => `repos/${zipFile.name}`)
	const allMetrics: Metrics[] = [];
	for(const repoPath of reposPath)
	{
		const folderPath = getFolderPath(repoPath);
		await ensureDirectoryCreatedAsync(folderPath);
		extractZip(repoPath, folderPath);
		allMetrics.push(extractMetrics(folderPath))
		await tryRemoveDirectory(folderPath)
	}
	const csvFilePath = 'data/new_snapshot_data.csv'
	await writeDataAsCsvToFileAsync(allMetrics, csvFilePath);
}

main().catch(console.error)