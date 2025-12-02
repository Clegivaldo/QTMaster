$path = "backend/src/controllers/editorTemplateController.ts"
$content = Get-Content $path -Raw

$corrupted = @'
    } catch (error) {
      logger.error('Generate PDF error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        success: false,
        doc.moveDown();
        doc.fontSize(10).text('Conteúdo do template (resumo):');
        const elements = template.elements as any[];
        doc.fontSize(9).text(JSON.stringify({ elements: (elements || []).length }, null, 2));
        doc.end();
        await new Promise<void>((resolve, reject) => {
          stream.on('finish', () => resolve());
          stream.on('error', (err) => reject(err));
        });
      } else if (exportOptions.format === 'png') {
        const transparentPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
        const buffer = Buffer.from(transparentPngBase64, 'base64');
        await fsPromises.writeFile(filePath, buffer);
      } else if (exportOptions.format === 'html') {
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>${template.name}</title></head><body><h1>${template.name}</h1><pre>${JSON.stringify(template, null, 2)}</pre></body></html>`;
        await fsPromises.writeFile(filePath, html, 'utf-8');
      } else if (exportOptions.format === 'json') {
        await fsPromises.writeFile(filePath, JSON.stringify(template, null, 2), 'utf-8');
      } else {
        await fsPromises.writeFile(filePath, `Export do template ${template.name}`, 'utf-8');
      }

      const exportUrl = `/api/exports/${filename}`;
      res.json({ success: true, data: { url: exportUrl, filename, format: exportOptions.format } });
    } catch (error) {
      logger.error('Public export error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
'@

$fixed = @'
    } catch (error) {
      logger.error('Generate PDF error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        success: false,
        error: 'Erro ao gerar PDF',
      });
    }
  }

  previewHTML = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { validationId } = req.body;

      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID do template é obrigatório',
        });
        return;
      }

      if (!validationId) {
        res.status(400).json({
          success: false,
          error: 'validationId é obrigatório',
        });
        return;
      }

      const html = await pdfGenerationService.generateHTMLFromEditorTemplate(id, validationId, req.user.id);

      res.json({ html });
    } catch (error) {
      logger.error('Preview HTML error:', { error: error instanceof Error ? error.message : error });
      res.status(500).json({
        success: false,
        error: 'Erro ao gerar preview HTML',
      });
    }
  }
'@

# Normalize line endings for comparison
$content = $content -replace "`r`n", "`n"
$corrupted = $corrupted -replace "`r`n", "`n"
$fixed = $fixed -replace "`r`n", "`n"

if ($content.Contains($corrupted)) {
    $newContent = $content.Replace($corrupted, $fixed)
    Set-Content $path -Value $newContent -NoNewline
    Write-Host "File fixed successfully."
} else {
    Write-Host "Corrupted block not found. Content might be slightly different."
    # Debug: Output first 100 chars of corrupted block to see if it matches
    Write-Host "Expected start: $($corrupted.Substring(0, 100))"
}
