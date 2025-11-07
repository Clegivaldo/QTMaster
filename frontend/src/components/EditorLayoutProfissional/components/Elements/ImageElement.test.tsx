import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageElement from './ImageElement';
import { mockImageElement, createTestElement } from '../../../../test/test-utils';
import { ImageData } from '../../../../types/editor';

// Mock the hooks and modals
// We expose a global override `window.__useImageUploadMock` so individual tests can change
// the behavior at runtime (tests in this file sometimes attempt to re-mock the module).
vi.mock('../../../../hooks/useImageUpload', () => ({
  default: () => {
    // If tests set window.__useImageUploadMock, use it. Otherwise return default behavior.
    const override = (globalThis as any).__useImageUploadMock;
    if (override && typeof override === 'function') {
      return override();
    }

    return {
      uploadImage: vi.fn().mockResolvedValue({
        src: 'test-uploaded-image.jpg',
        alt: 'Uploaded Image',
        originalSize: { width: 400, height: 300 },
        aspectRatio: 4 / 3
      }),
      isUploading: false,
      uploadProgress: 0
    };
  }
}));

vi.mock('../Modals/ImageGalleryModal', () => ({
  default: ({ isOpen, onClose, onSelectImage }: any) => 
    isOpen ? (
      <div data-testid="image-gallery-modal">
        <button onClick={onClose}>Close</button>
        <button 
          onClick={() => onSelectImage({
            src: 'gallery-image.jpg',
            alt: 'Gallery Image',
            originalSize: { width: 300, height: 200 }
          })}
        >
          Select Gallery Image
        </button>
      </div>
    ) : null
}));

describe('ImageElement Component', () => {
  const mockProps = {
    isSelected: false,
    zoom: 1,
    onEdit: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure any per-test override is cleared so tests start deterministic
    try { (globalThis as any).__useImageUploadMock = undefined; } catch(e) { /* ignore */ }
  });

  describe('Image Rendering', () => {
    it('should render image when src is provided', () => {
      render(
        <ImageElement 
          element={mockImageElement} 
          {...mockProps} 
        />
      );
      
      const image = screen.getByRole('img');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', mockImageElement.content.src);
      expect(image).toHaveAttribute('alt', mockImageElement.content.alt);
    });

    it('should render upload placeholder when no image src', () => {
      const emptyImageElement = createTestElement('image', {
        content: {
          src: '',
          alt: '',
          originalSize: { width: 200, height: 150 }
        }
      });

      const { container } = render(
        <ImageElement 
          element={emptyImageElement} 
          {...mockProps} 
        />
      );

      const placeholder = container.querySelector('[class*="border-dashed"]') || container.querySelector('div[style*="background-color"]');
      expect(placeholder).toBeInTheDocument();
      expect(container).toHaveTextContent('Clique para fazer upload');
      expect(container).toHaveTextContent('ou arraste um arquivo aqui');
      expect(container).toHaveTextContent('PNG, JPG, GIF até 5MB');
    });

    it('should show image info when selected', () => {
      render(
        <ImageElement 
          element={mockImageElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      expect(screen.getByText('Test Image')).toBeInTheDocument();
      expect(screen.getByText('300 × 200px')).toBeInTheDocument();
    });

    it('should apply correct image styles', () => {
      render(
        <ImageElement 
          element={mockImageElement} 
          {...mockProps} 
        />
      );
      
      const image = screen.getByRole('img');
      expect(image).toHaveClass('w-full', 'h-full', 'object-contain');
      expect(image).toHaveAttribute('draggable', 'false');
    });
  });

  describe('Image Upload', () => {
    it('should show upload controls when selected', async () => {
      const user = userEvent.setup();
      
      render(
        <ImageElement 
          element={mockImageElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      // Hover to show controls
      const container = screen.getByRole('img').parentElement;
      await user.hover(container!);
      
      expect(screen.getByTitle('Fazer upload de nova imagem')).toBeInTheDocument();
      expect(screen.getByTitle('Escolher da galeria')).toBeInTheDocument();
      expect(screen.getByTitle('Remover imagem')).toBeInTheDocument();
      expect(screen.getByTitle('Manter proporção')).toBeInTheDocument();
    });

    it('should trigger file input when upload button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <ImageElement 
          element={mockImageElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByRole('img').parentElement;
      await user.hover(container!);
      
      const uploadButton = screen.getByTitle('Fazer upload de nova imagem');
      await user.click(uploadButton);
      
      // File input should be present (hidden)
      const fileInput = container!.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });

    it('should handle file selection and upload', async () => {
      const user = userEvent.setup();
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      render(
        <ImageElement 
          element={mockImageElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByRole('img').parentElement;
      const fileInput = container!.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(mockProps.onEdit).toHaveBeenCalledWith(
          mockImageElement.id,
          expect.objectContaining({
            src: 'test-uploaded-image.jpg',
            alt: 'Uploaded Image',
            originalSize: { width: 400, height: 300 }
          })
        );
      });
    });

    it('should handle drag and drop upload', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      render(
        <ImageElement 
          element={mockImageElement} 
          {...mockProps} 
        />
      );
      
      const container = screen.getByRole('img').parentElement;
      
      fireEvent.dragOver(container!, {
        dataTransfer: {
          files: [file]
        }
      });
      
      fireEvent.drop(container!, {
        dataTransfer: {
          files: [file]
        }
      });
      
      await waitFor(() => {
        expect(mockProps.onEdit).toHaveBeenCalled();
      });
    });

    it('should show upload progress during upload', () => {
      const mockUseImageUpload = () => ({
        uploadImage: vi.fn(),
        isUploading: true,
        uploadProgress: 50
      });
      // Set the global override so the mocked module will use this implementation
      (globalThis as any).__useImageUploadMock = mockUseImageUpload;
      
      const emptyImageElement = createTestElement('image', {
        content: { src: '', alt: '', originalSize: { width: 200, height: 150 } }
      });
      
      render(
        <ImageElement 
          element={emptyImageElement} 
          {...mockProps} 
        />
      );
      
  expect(screen.getByText('Carregando...')).toBeInTheDocument();
  // Allow flexible whitespace between number and percent sign
  expect(screen.getByText(/50\s*%/)).toBeInTheDocument();
    });
  });

  describe('Image Gallery', () => {
    it('should open gallery modal when gallery button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <ImageElement 
          element={mockImageElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByRole('img').parentElement;
      await user.hover(container!);
      
      const galleryButton = screen.getByTitle('Escolher da galeria');
      await user.click(galleryButton);
      
      expect(screen.getByTestId('image-gallery-modal')).toBeInTheDocument();
    });

    it('should select image from gallery', async () => {
      const user = userEvent.setup();
      
      render(
        <ImageElement 
          element={mockImageElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByRole('img').parentElement;
      await user.hover(container!);
      
      const galleryButton = screen.getByTitle('Escolher da galeria');
      await user.click(galleryButton);
      
      const selectButton = screen.getByText('Select Gallery Image');
      await user.click(selectButton);
      
      expect(mockProps.onEdit).toHaveBeenCalledWith(
        mockImageElement.id,
        expect.objectContaining({
          src: 'gallery-image.jpg',
          alt: 'Gallery Image',
          originalSize: { width: 300, height: 200 }
        })
      );
    });

    it('should close gallery modal', async () => {
      const user = userEvent.setup();
      
      render(
        <ImageElement 
          element={mockImageElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByRole('img').parentElement;
      await user.hover(container!);
      
      const galleryButton = screen.getByTitle('Escolher da galeria');
      await user.click(galleryButton);
      
      const closeButton = screen.getByText('Close');
      await user.click(closeButton);
      
      expect(screen.queryByTestId('image-gallery-modal')).not.toBeInTheDocument();
    });
  });

  describe('Image Management', () => {
    it('should remove image when remove button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <ImageElement 
          element={mockImageElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByRole('img').parentElement;
      await user.hover(container!);
      
      const removeButton = screen.getByTitle('Remover imagem');
      await user.click(removeButton);
      
      expect(mockProps.onEdit).toHaveBeenCalledWith(
        mockImageElement.id,
        expect.objectContaining({
          src: '',
          alt: '',
          originalSize: { width: 200, height: 150 }
        })
      );
    });

    it('should maintain aspect ratio when button is clicked', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const imageWithAspectRatio = {
        ...mockImageElement,
        content: {
          ...mockImageElement.content,
          aspectRatio: 1.5
        }
      };
      
      render(
        <ImageElement 
          element={imageWithAspectRatio} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByRole('img').parentElement;
      await user.hover(container!);
      
      const aspectRatioButton = screen.getByTitle('Manter proporção');
      await user.click(aspectRatioButton);
      
      expect(consoleSpy).toHaveBeenCalledWith('Nova altura calculada:', expect.any(Number));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Placeholder Interactions', () => {
    it('should trigger upload when placeholder is clicked', async () => {
      const user = userEvent.setup();
      const emptyImageElement = createTestElement('image', {
        content: { src: '', alt: '', originalSize: { width: 200, height: 150 } }
      });
      
      const { container } = render(
        <ImageElement 
          element={emptyImageElement} 
          {...mockProps} 
        />
      );

      const placeholder = container.querySelector('[class*="border-dashed"]') || container.querySelector('div[style*="background-color"]');
      await user.click(placeholder!);

      // File input should be triggered (we can't directly test click on hidden input)
      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });

    it('should open gallery from placeholder button', async () => {
      const user = userEvent.setup();
      const emptyImageElement = createTestElement('image', {
        content: { src: '', alt: '', originalSize: { width: 200, height: 150 } }
      });
      
      const { container } = render(
        <ImageElement 
          element={emptyImageElement} 
          {...mockProps} 
        />
      );

      const galleryButton = container.querySelector('button');
      await user.click(galleryButton!);

      expect(screen.getByTestId('image-gallery-modal')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle upload errors gracefully', async () => {
      const mockUseImageUpload = () => ({
        uploadImage: vi.fn().mockRejectedValue(new Error('Upload failed')),
        isUploading: false,
        uploadProgress: 0
      });
      (globalThis as any).__useImageUploadMock = mockUseImageUpload;
      
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      const user = userEvent.setup();
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      render(
        <ImageElement 
          element={mockImageElement} 
          {...mockProps} 
        />
      );
      
      const container = screen.getByRole('img').parentElement;
      const fileInput = container!.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Upload failed');
      });
      
      alertSpy.mockRestore();
    });

    it('should filter non-image files in drag and drop', () => {
      const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      render(
        <ImageElement 
          element={mockImageElement} 
          {...mockProps} 
        />
      );
      
      const container = screen.getByRole('img').parentElement;
      
      fireEvent.drop(container!, {
        dataTransfer: {
          files: [textFile]
        }
      });
      
      // Should not call onEdit for non-image files
      expect(mockProps.onEdit).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper alt text for images', () => {
      render(
        <ImageElement 
          element={mockImageElement} 
          {...mockProps} 
        />
      );
      
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', mockImageElement.content.alt);
    });

    it('should have proper button titles for controls', async () => {
      const user = userEvent.setup();
      
      render(
        <ImageElement 
          element={mockImageElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const container = screen.getByRole('img').parentElement;
      await user.hover(container!);
      
      expect(screen.getByTitle('Fazer upload de nova imagem')).toBeInTheDocument();
      expect(screen.getByTitle('Escolher da galeria')).toBeInTheDocument();
      expect(screen.getByTitle('Remover imagem')).toBeInTheDocument();
      expect(screen.getByTitle('Manter proporção')).toBeInTheDocument();
    });

    it('should have proper file input attributes', () => {
      render(
        <ImageElement 
          element={mockImageElement} 
          {...mockProps} 
        />
      );
      
      const fileInput = screen.getByRole('img').parentElement!.querySelector('input[type="file"]');
      expect(fileInput).toHaveAttribute('accept', 'image/*');
    });
  });
});